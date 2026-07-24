const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  if (filePath.endsWith('.css')) {
    newContent = newContent
      .replace(/font-weight:\s*['"]?([6789]00|bold|bolder)['"]?/g, 'font-weight: var(--fw-head)')
      .replace(/font-weight:\s*['"]?(500|medium)['"]?/g, 'font-weight: var(--fw-sub)')
      .replace(/font-weight:\s*['"]?([34]00|normal|lighter)['"]?/g, 'font-weight: var(--fw-body)')
      .replace(/--btn-font-weight:\s*['"]?[456789]00['"]?/g, '--btn-font-weight: var(--fw-sub)');
  } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    // For JSX, we want to replace `fontWeight: "600"` or `fontWeight: 600` with `fontWeight: "var(--fw-head)"`
    // We'll use a regex that finds `fontWeight:` and then replaces the values on that line.
    
    const lines = newContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('fontWeight')) {
        // Replace exact matches first
        lines[i] = lines[i]
          .replace(/(fontWeight:\s*)["']?(?:[6789]00|bold|bolder)["']?/g, '$1"var(--fw-head)"')
          .replace(/(fontWeight:\s*)["']?(?:500|medium)["']?/g, '$1"var(--fw-sub)"')
          .replace(/(fontWeight:\s*)["']?(?:[34]00|normal|lighter)["']?/g, '$1"var(--fw-body)"');
          
        // Handle ternary like `fontWeight: activeSection === section.id ? "600" : "400"`
        if (lines[i].includes('?')) {
          lines[i] = lines[i]
            .replace(/["'](?:[6789]00|bold|bolder)["']/g, '"var(--fw-head)"')
            .replace(/(?<!\w)(?:[6789]00|bold|bolder)(?!\w)/g, '"var(--fw-head)"')
            .replace(/["'](?:500|medium)["']/g, '"var(--fw-sub)"')
            .replace(/(?<!\w)(?:500)(?!\w)/g, '"var(--fw-sub)"')
            .replace(/["'](?:[34]00|normal|lighter)["']/g, '"var(--fw-body)"')
            .replace(/(?<!\w)(?:[34]00)(?!\w)/g, '"var(--fw-body)"');
        }
      }
    }
    newContent = lines.join('\n');
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

const srcDir = path.join(__dirname, 'client', 'src');
walkDir(srcDir, (filePath) => {
  if (filePath.endsWith('.css') || filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    replaceInFile(filePath);
  }
});
console.log('Done!');
