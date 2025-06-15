export const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `ไม่พบ API endpoint: ${req.originalUrl}`
  });
}; 