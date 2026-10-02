const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'pages', 'CreatePost.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// Replace top
content = content.replace(
  /\) :\s*\(\s*\{\/\* Header \*\/\}\s*<div className="mb-6">/,
  `) : (
        <>
      {/* Header */}
      <div className="mb-6">`
);

// Replace bottom
content = content.replace(
  /<\/div>\n    <\/div>\n  \);\n}/,
  `</div>
      </>
      )}
    </div>
  );
}`
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('JSX fixed.');
