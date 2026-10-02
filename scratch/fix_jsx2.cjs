const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'pages', 'CreatePost.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// Replace bottom
content = content.replace(
  /<\/div>\s*<\/div>\s*\);\s*}/,
  `</div>
      </>
      )}
    </div>
  );
}`
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('JSX fixed.');
