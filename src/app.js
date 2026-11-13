const express = require('express');
const coursesRoutes = require('./routes/courses');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CodeCraftHub API',
    endpoints: [
      'GET /api/courses',
      'GET /api/courses/:id',
      'POST /api/courses',
      'PUT /api/courses/:id',
      'PATCH /api/courses/:id',
      'DELETE /api/courses/:id',
    ],
  });
});

app.use('/api/courses', coursesRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`CodeCraftHub API running on http://localhost:${PORT}`);
});
