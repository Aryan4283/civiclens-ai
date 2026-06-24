const fs = require('fs');
const readline = require('readline');
const path = require('path');

const srcFile = 'C:/Users/ARYAN SARAD/.gemini/antigravity-ide/brain/3be5fe97-0ec2-43a2-956e-c6c4009add67/.system_generated/logs/transcript.jsonl';
const destDir = 'C:/AI-2 Projects/civiclens.ai/client/public/seeds/';

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const rl = readline.createInterface({
  input: fs.createReadStream(srcFile)
});

let extractedCount = 0;

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    // Check if it's the exact steps where user uploaded the 10 images
    if (obj.step_index === 1487 || obj.step_index === 1496) {
      console.log('Found step ' + obj.step_index);
      
      const str = JSON.stringify(obj);
      let match;
      const regex = /"mime_type":"image\/[a-zA-Z]+","data":"([A-Za-z0-9+/=]+)"/g;
      
      while ((match = regex.exec(str)) !== null) {
         const base64Data = match[1];
         const filename = 'user_img_' + extractedCount + '.jpg';
         fs.writeFileSync(path.join(destDir, filename), Buffer.from(base64Data, 'base64'));
         console.log('Extracted image ' + filename);
         extractedCount++;
      }
    }
  } catch(e) {}
});

rl.on('close', () => console.log('Total extracted:', extractedCount));
