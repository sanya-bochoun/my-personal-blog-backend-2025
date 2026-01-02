export const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `API endpoint not found: ${req.originalUrl}`
  });
}; 