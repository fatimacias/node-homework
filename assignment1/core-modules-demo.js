const os = require('os');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log('Platform:', os.platform());
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());

// Path module

const joinedPath = path.join(sampleFilesDir,'foler' ,'file.txt');
console.log('Joined path:', joinedPath);

// fs.promises API
async function writeAndReadFile() {
    const demoFilePath = path.join(sampleFilesDir, 'demo.txt');
    try {
        await fsPromises.writeFile(demoFilePath, 'Hello from fs.promises!');
        const data = await fsPromises.readFile(demoFilePath, 'utf8');
        console.log('fs.promises read:', data);
    } catch (err) {
        console.log('File error:', err);
    }
}
writeAndReadFile();

// Streams for large files- log first 40 chars of each chunk

const largeFilePath = path.join(sampleFilesDir, 'largefile.txt');
async function generateLargeFile() {
    let content = '';
    for (let i = 1; i <= 100; i++) {
        content += `This is line number ${i} in a large file created for streams.\n`;
    }
    await fsPromises.writeFile(largeFilePath, content);
}

async function readLargeFileStream() {
    await generateLargeFile();
    const stream = fs.createReadStream(largeFilePath, {
        encoding: 'utf8',
        highWaterMark: 1024,
    });

    stream.on('data', (chunk) => {
        console.log('Read chunk:', chunk.substring(0, 40) + '...');
    });

    stream.on('end', () => {
        console.log('Finished reading large file with streams.');
    });

    stream.on('error', (err) => {
        console.log('Stream error:', err);
    });
}

readLargeFileStream();