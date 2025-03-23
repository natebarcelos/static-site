const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Site Configuration
const config = {
    websiteName: "Nate's Website"
};

// Function to extract frontmatter and content
function extractFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
        return { frontmatter: {}, content };
    }
    
    const frontmatter = {};
    frontmatterMatch[1].split('\n').forEach(line => {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
            frontmatter[key] = value;
        }
    });
    
    return { frontmatter, content: frontmatterMatch[2] };
}

// Function to extract H1 title from HTML file
function extractH1Title(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/);
    return h1Match ? h1Match[1] : 'Untitled Post';
}

// Serve static files from the dist directory
app.use(express.static('dist'));

// Handle all routes
app.get('*', (req, res) => {
    // Remove leading slash
    let filePath = req.path.replace(/^\//, '');
    
    // Special handling for /blog/ path
    if (filePath === 'blog' || filePath === 'blog/') {
        const blogDir = path.join(__dirname, 'dist', 'blog');
        if (fs.existsSync(blogDir)) {
            const files = fs.readdirSync(blogDir)
                .filter(file => file.endsWith('.html'))
                .map(file => {
                    const fullPath = path.join(blogDir, file);
                    const title = extractH1Title(fullPath);
                    
                    // Get the corresponding markdown file to extract the date
                    const mdFile = path.join(__dirname, 'content', 'blog', file.replace('.html', '.md'));
                    const mdContent = fs.readFileSync(mdFile, 'utf-8');
                    const { frontmatter } = extractFrontmatter(mdContent);
                    const date = frontmatter.date || '1970-01-01';
                    
                    console.log(`Blog post: ${title}, Date: ${date}`);
                    return {
                        title,
                        file,
                        date
                    };
                })
                .sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    console.log(`Comparing: ${a.title} (${dateA}) with ${b.title} (${dateB})`);
                    return dateB - dateA;
                });
            
            const blogPosts = files
                .map(post => {
                    const date = new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    return `<li><a href="/blog/${post.file}">${post.title}</a><span class="post-date">${date}</span></li>`;
                })
                .join('\n');
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Blog Posts - ${config.websiteName}</title>
                    <link rel="stylesheet" href="/css/style.css">
                </head>
                <body>
                    <header>
                        <nav>
                            <div class="nav-container">
                                <a href="/" class="logo">${config.websiteName}</a>
                                <ul class="nav-links">
                                    <li><a href="/">Home</a></li>
                                    <li><a href="/blog">Blog</a></li>
                                    <li><a href="/about">About</a></li>
                                    <li><a href="/faq">FAQ</a></li>
                                </ul>
                            </div>
                        </nav>
                    </header>
                    <main>
                        <div class="markdown-content">
                            <h1>Blog Posts</h1>
                            <ul class="blog-list">
                                ${blogPosts}
                            </ul>
                        </div>
                    </main>
                    <footer>
                        <div class="footer-content">
                            <p>&copy; 2024 ${config.websiteName}. All rights reserved.</p>
                        </div>
                    </footer>
                </body>
                </html>
            `;
            return res.send(html);
        }
    }
    
    // Handle other paths
    if (!filePath.endsWith('.html')) {
        filePath += '.html';
    }
    
    // If no file specified, serve index.html
    if (filePath === '') {
        filePath = 'index.html';
    }
    
    const fullPath = path.join(__dirname, 'dist', filePath);
    console.log('Attempting to serve:', fullPath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        console.error('File not found:', fullPath);
        return res.status(404).send('File not found');
    }
    
    // Try to send the file
    res.sendFile(fullPath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Error serving file');
        }
    });
});

app.listen(port, () => {
    console.log(`Development server running at http://localhost:${port}`);
}); 