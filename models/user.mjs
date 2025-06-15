import pool from '../utils/db.mjs';

export class User {
    static async findOne({ email }) {
        try {
            const result = await pool.query(
                `SELECT 
                    u.*, 
                    us.last_active,
                    CASE 
                        WHEN u.is_locked = true THEN 'locked'
                        ELSE 'active'
                    END as status
                FROM users u 
                LEFT JOIN user_sessions us ON u.id = us.user_id 
                WHERE u.email = $1`,
                [email]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async findById(userId) {
        try {
            const result = await pool.query(
                `SELECT 
                    u.*, 
                    us.last_active,
                    CASE 
                        WHEN u.is_locked = true THEN 'locked'
                        ELSE 'active'
                    END as status
                FROM users u 
                LEFT JOIN user_sessions us ON u.id = us.user_id 
                WHERE u.id = $1`,
                [userId]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async findAll({ page, limit, search }) {
        try {
            const offset = (page - 1) * limit;
            const query = `
                SELECT 
                    u.id, 
                    u.username, 
                    u.email, 
                    u.role,
                    u.is_verified,
                    u.is_locked,
                    u.created_at,
                    u.updated_at,
                    us.last_active as last_login,
                    CASE 
                        WHEN u.is_locked = true THEN 'locked'
                        ELSE 'active'
                    END as status
                FROM users u
                LEFT JOIN (
                    SELECT user_id, MAX(last_active) as last_active
                    FROM user_sessions
                    GROUP BY user_id
                ) us ON u.id = us.user_id
                WHERE u.username ILIKE $1 OR u.email ILIKE $1
                ORDER BY u.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            const result = await pool.query(query, [`%${search}%`, limit, offset]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    static async count({ search }) {
        try {
            const query = `
                SELECT COUNT(*) 
                FROM users u
                WHERE u.username ILIKE $1 OR u.email ILIKE $1
            `;
            const result = await pool.query(query, [`%${search}%`]);
            return parseInt(result.rows[0].count);
        } catch (error) {
            throw error;
        }
    }

    static async updateStatus(userId, status) {
        try {
            const query = `
                UPDATE users 
                SET is_locked = $1, updated_at = NOW() 
                WHERE id = $2
                RETURNING 
                    id, 
                    username, 
                    email,
                    role,
                    is_locked,
                    CASE 
                        WHEN is_locked = true THEN 'locked'
                        ELSE 'active'
                    END as status
            `;
            const isLocked = status === 'locked';
            const result = await pool.query(query, [isLocked, userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async delete(userId) {
        try {
            // ลบ sessions ก่อน
            await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
            // จากนั้นลบ user
            const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
            const result = await pool.query(query, [userId]);
            return result.rows.length > 0;
        } catch (error) {
            throw error;
        }
    }

    static async updateRole(userId, role) {
        try {
            const query = `
                UPDATE users 
                SET role = $1, updated_at = NOW() 
                WHERE id = $2
                RETURNING 
                    id, 
                    username, 
                    email,
                    role,
                    is_locked,
                    CASE 
                        WHEN is_locked = true THEN 'locked'
                        ELSE 'active'
                    END as status
            `;
            const result = await pool.query(query, [role, userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    static async updatePassword(userId, hashedPassword) {
        try {
            const query = `
                UPDATE users 
                SET password = $1, updated_at = NOW() 
                WHERE id = $2
                RETURNING id, username, email
            `;
            const result = await pool.query(query, [hashedPassword, userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }
} 