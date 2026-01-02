import db from '../utils/db.mjs';
import { io } from '../server.mjs';

/**
 * ดึงรายการแจ้งเตือนและกิจกรรมล่าสุด
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT 
        n.id,
        n.type,
        n.message as content,
        CASE 
          WHEN n.link IS NOT NULL AND n.link != '' AND n.link NOT LIKE '/posts/%' THEN n.link
          WHEN n.link LIKE '/posts/%' AND p.slug IS NOT NULL THEN '/article/' || p.slug
          WHEN n.link LIKE '/posts/%' AND p.slug IS NULL THEN '/article/' || (n.data->>'post_id')
          WHEN p.slug IS NOT NULL THEN '/article/' || p.slug
          WHEN (n.data->>'post_id') IS NOT NULL THEN '/article/' || (n.data->>'post_id')
          ELSE n.link
        END as link,
        n.data,
        n.created_at,
        p.slug as post_slug,
        COALESCE(u.full_name, u2.full_name) as user_name,
        COALESCE(u.avatar_url, u2.avatar_url) as user_avatar,
        a.full_name as author_name,
        a.avatar_url as author_avatar
       FROM notifications n
       LEFT JOIN users u ON u.id = (n.data->>'user_id')::integer
       LEFT JOIN users u2 ON u2.id = n.user_id
       LEFT JOIN posts p ON p.id = (n.data->>'post_id')::integer
       LEFT JOIN users a ON a.id = p.author_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      status: 'success',
      data: {
        activities: result.rows
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch notifications'
    });
  }
};

/**
 * ทำเครื่องหมายว่าอ่านแล้ว
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        notification: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark notification as read'
    });
  }
};

/**
 * ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark all notifications as read'
    });
  }
};

/**
 * ลบการแจ้งเตือน
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await db.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete notification'
    });
  }
};

/**
 * ลบการแจ้งเตือนทั้งหมด
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `DELETE FROM notifications 
       WHERE user_id = $1 
       RETURNING id`,
      [userId]
    );

    res.json({
      status: 'success',
      message: 'All notifications deleted successfully',
      data: {
        deletedCount: result.rowCount
      }
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete all notifications'
    });
  }
};

/**
 * สร้างการแจ้งเตือนใหม่
 */
export const createNotification = async (userId, type, message, link = null, data = {}) => {
  try {
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, message, link, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, message, link, JSON.stringify(data)]
    );
    // ดึงข้อมูล user สำหรับแจ้งเตือน
    const notification = result.rows[0];
    const userResult = await db.query('SELECT full_name as user_name, avatar_url as user_avatar FROM users WHERE id = $1', [data.user_id || userId]);
    const user = userResult.rows[0] || {};
    // emit event ไปยัง client ทุกคน (หรือจะ filter ตาม userId ก็ได้)
    io.emit('notification', {
      ...notification,
      user_name: user.user_name,
      user_avatar: user.user_avatar
    });
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
}; 