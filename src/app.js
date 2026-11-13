// CodeCraftHub beginner REST API
// Run with: npm start (the server listens on port 5000).

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = 5000;
const COURSES_FILE = path.join(__dirname, '../data/courses.json');
const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];

// Parse incoming JSON request bodies so routes can read req.body.
app.use(express.json());

// Read all courses from disk. Create the JSON file on first use if it is missing.
async function readCourses() {
  try {
    const fileContents = await fs.readFile(COURSES_FILE, 'utf8');
    const courses = JSON.parse(fileContents);

    if (!Array.isArray(courses)) {
      throw new Error('The courses file must contain a JSON array.');
    }

    return courses;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(path.dirname(COURSES_FILE), { recursive: true });
      await fs.writeFile(COURSES_FILE, '[]\n', 'utf8');
      return [];
    }

    throw error;
  }
}

// Save the full course list back to the JSON file in a readable format.
async function writeCourses(courses) {
  await fs.mkdir(path.dirname(COURSES_FILE), { recursive: true });
  await fs.writeFile(COURSES_FILE, `${JSON.stringify(courses, null, 2)}\n`, 'utf8');
}

// Check the fields required when creating or replacing a course.
function validateCourse(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  for (const field of ['name', 'description', 'target_date', 'status']) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      return `The ${field} field is required and must be a non-empty string.`;
    }
  }

  // Check both the YYYY-MM-DD shape and that the date is a real calendar date.
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(body.target_date);
  if (!dateMatch) {
    return 'target_date must use the YYYY-MM-DD format.';
  }
  const [, year, month, day] = dateMatch;
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day)
  ) {
    return 'target_date must be a valid calendar date.';
  }

  if (!VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}.`;
  }

  return null;
}

// Return the next integer ID, starting at 1 and advancing past the largest existing ID.
function getNextId(courses) {
  return courses.reduce((largestId, course) => {
    const id = Number(course.id);
    return Number.isInteger(id) && id > largestId ? id : largestId;
  }, 0) + 1;
}

// Add a new course.
app.post('/api/courses', async (req, res) => {
  const validationError = validateCourse(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const courses = await readCourses();
    const newCourse = {
      id: getNextId(courses),
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      target_date: req.body.target_date,
      status: req.body.status,
      created_at: new Date().toISOString(),
    };

    courses.push(newCourse);
    await writeCourses(courses);
    return res.status(201).json(newCourse);
  } catch (error) {
    console.error('Unable to create course:', error);
    return res.status(500).json({ error: 'Could not read or write the courses file.' });
  }
});

// Get every course.
app.get('/api/courses', async (req, res) => {
  try {
    return res.json(await readCourses());
  } catch (error) {
    console.error('Unable to read courses:', error);
    return res.status(500).json({ error: 'Could not read the courses file.' });
  }
});

// Get one course by its numeric ID, for example GET /api/courses/1.
app.get('/api/courses/:id', async (req, res) => {
  try {
    const courses = await readCourses();
    const course = courses.find((item) => String(item.id) === req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    return res.json(course);
  } catch (error) {
    console.error('Unable to read course:', error);
    return res.status(500).json({ error: 'Could not read the courses file.' });
  }
});

// Replace all editable course fields while keeping its ID and creation timestamp.
app.put('/api/courses/:id', async (req, res) => {
  const validationError = validateCourse(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const courses = await readCourses();
    const index = courses.findIndex((item) => String(item.id) === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const updatedCourse = {
      ...courses[index],
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      target_date: req.body.target_date,
      status: req.body.status,
    };

    courses[index] = updatedCourse;
    await writeCourses(courses);
    return res.json(updatedCourse);
  } catch (error) {
    console.error('Unable to update course:', error);
    return res.status(500).json({ error: 'Could not read or write the courses file.' });
  }
});

// Delete a course by its numeric ID.
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const courses = await readCourses();
    const index = courses.findIndex((item) => String(item.id) === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const [deletedCourse] = courses.splice(index, 1);
    await writeCourses(courses);
    return res.json({ message: 'Course deleted successfully.', course: deletedCourse });
  } catch (error) {
    console.error('Unable to delete course:', error);
    return res.status(500).json({ error: 'Could not read or write the courses file.' });
  }
});

// Convert malformed JSON request bodies into a clear 400 response.
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body contains invalid JSON.' });
  }

  console.error('Unexpected server error:', error);
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// Ensure the data file exists before accepting requests, then start the server.
async function startServer() {
  try {
    await readCourses();
    app.listen(PORT, () => {
      console.log(`CodeCraftHub API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Could not initialize courses.json:', error);
    process.exitCode = 1;
  }
}

startServer();
