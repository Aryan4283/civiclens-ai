const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/ARYAN SARAD/.gemini/antigravity-ide/brain/3be5fe97-0ec2-43a2-956e-c6c4009add67/';
const destDir = 'C:/AI-2 Projects/civiclens.ai/client/public/seeds/';

const exactMapping = {
  // Batch 1 (03:35:50)
  'media__1782251763539.png': 'flooding1.jpg',
  'media__1782251915838.jpg': 'flooding2.jpg',
  'media__1782252063597.jpg': 'pothole1.jpg',
  'media__1782252079350.png': 'road_damage1.jpg',
  'media__1782252128875.jpg': 'water_leak1.jpg',
  
  // Batch 2 (03:53:54)
  'media__1782252534645.jpg': 'water_leak2.jpg',
  'media__1782252735262.jpg': 'pothole2.jpg',
  'media__1782252886377.png': 'waste1.jpg',
  'media__1782253240785.jpg': 'waste2.jpg',
  'media__1782253418915.png': 'streetlight1.jpg'
};

console.log('Copying exact user images to seeds directory...');

for (const [srcFile, destFile] of Object.entries(exactMapping)) {
  const fullSrc = path.join(srcDir, srcFile);
  const fullDest = path.join(destDir, destFile);
  if (fs.existsSync(fullSrc)) {
    fs.copyFileSync(fullSrc, fullDest);
    console.log(`Copied ${srcFile} to ${destFile}`);
  } else {
    console.error(`Source file missing: ${srcFile}`);
  }
}
