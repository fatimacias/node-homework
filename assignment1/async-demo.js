const fs = require('fs');
const path = require('path');
const fsPromises = require('fs/promises');

const filePath = path.join(__dirname, 'sample-files', 'sample.txt');
// Write a sample file for demonstration
 fs.writeFile(filePath, 'Hello, async world!', (err) => {
        if (err) return console.log('Write error:', err);
      });
// 1. Callback style
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) return console.log('Callback read error:', err);
  console.log('Callback read:', data);
});

  // Callback hell example (test and leave it in comments):
/*
fs.readFile(file1, 'utf8', (err, data1) => {
    fs.readFile(file2, 'utf8', (err, data2) => {
      fs.readFile(file3, 'utf8', (err, data3) => {
        // callback hell...
      });
    });
  });
*/ 

  // 2. Promise style

const readWithPromise = () => {
  return fsPromises.readFile(filePath, 'utf8')
    .then(data => console.log('Promise read:', data))
    .catch(err => console.log('Promise read error:', err));
};
readWithPromise();

      // 3. Async/Await style
const readAsync = async () => {
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    console.log('Async/Await read:', data);
  } catch (err) {
    console.log('Async/Await read error:', err);
  }
};
readAsync();