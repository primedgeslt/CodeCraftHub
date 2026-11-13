const fs = require('node:fs/promises');
const path = require('node:path');

const filePath = path.join(__dirname, '../../data/courses.json');

async function readCourses() {
  try {
    const contents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeCourses(courses) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(courses, null, 2));
}

module.exports = {
  readCourses,
  writeCourses,
};
