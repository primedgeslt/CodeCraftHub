const express = require('express');
const { randomUUID } = require('node:crypto');

const { readCourses, writeCourses } = require('../storage/courses');

const router = express.Router();

const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];

function validateCourse(course) {
  if (!course || typeof course.name !== 'string' || !course.name.trim()) {
    return 'Course name is required.';
  }

  if (typeof course.description !== 'string') {
    return 'Description must be a string.';
  }

  if (!course.targetCompletionDate) {
    return 'Target completion date is required.';
  }

  if (!VALID_STATUSES.includes(course.status)) {
    return `Status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  return null;
}

router.get('/', async (req, res) => {
  try {
    const courses = await readCourses();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error reading courses.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const courses = await readCourses();
    const course = courses.find((item) => item.id === req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving course.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const course = req.body;

    const validationError = validateCourse(course);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const courses = await readCourses();
    const newCourse = {
      id: randomUUID(),
      name: course.name.trim(),
      description: course.description.trim(),
      targetCompletionDate: course.targetCompletionDate,
      status: course.status,
    };

    courses.push(newCourse);
    await writeCourses(courses);

    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ message: 'Error creating course.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedCourse = req.body;

    const validationError = validateCourse(updatedCourse);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const courses = await readCourses();
    const index = courses.findIndex((course) => course.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    courses[index] = {
      ...courses[index],
      id: req.params.id,
      name: updatedCourse.name.trim(),
      description: updatedCourse.description.trim(),
      targetCompletionDate: updatedCourse.targetCompletionDate,
      status: updatedCourse.status,
    };

    await writeCourses(courses);
    res.json(courses[index]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating course.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const courses = await readCourses();
    const index = courses.findIndex((course) => course.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const existingCourse = courses[index];
    const updatedCourse = {
      ...existingCourse,
      ...req.body,
    };

    const validationError = validateCourse(updatedCourse);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    courses[index] = {
      ...existingCourse,
      ...req.body,
      name: req.body.name ? req.body.name.trim() : existingCourse.name,
      description: req.body.description ? req.body.description.trim() : existingCourse.description,
    };

    await writeCourses(courses);
    res.json(courses[index]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating course.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const courses = await readCourses();
    const index = courses.findIndex((course) => course.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const [deletedCourse] = courses.splice(index, 1);
    await writeCourses(courses);

    res.json({
      message: 'Course deleted successfully.',
      deletedCourse,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course.' });
  }
});

module.exports = router;
