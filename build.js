const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

// Configure marked for security
marked.setOptions({
    headerIds: true,
    mangle: false
});

// Directories
const CONTENT_DIR = 'content';
const TEMPLATE_DIR = 'templates';
const OUTPUT_DIR = 'dist';

// Ensure directories exist
fs.ensureDirSync(CONTENT_DIR);
fs.ensureDirSync(OUTPUT_DIR);
fs.ensureDirSync(path.join(OUTPUT_DIR, 'css'));

// Copy static assets
fs.copySync('css', path.join(OUTPUT_DIR, 'css'));

// Read base template
const baseTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'base.html'), 'utf-8');

// Function to convert markdown to HTML
function convertMarkdownToHtml(markdown, title) {
    const html = marked.parse(markdown);
    return baseTemplate
        .replace('{{title}}', title)
        .replace('{{content}}', `<div class="markdown-content">${html}</div>`);
}

// Build pages
function buildPages() {
    const pages = fs.readdirSync(CONTENT_DIR)
        .filter(file => file.endsWith('.md'));

    pages.forEach(page => {
        const content = fs.readFileSync(path.join(CONTENT_DIR, page), 'utf-8');
        const title = page.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const html = convertMarkdownToHtml(content, title);
        
        const outputPath = path.join(OUTPUT_DIR, page.replace('.md', '.html'));
        fs.writeFileSync(outputPath, html);
    });
}

// Build blog posts
function buildBlog() {
    const blogDir = path.join(CONTENT_DIR, 'blog');
    const outputBlogDir = path.join(OUTPUT_DIR, 'blog');
    
    if (fs.existsSync(blogDir)) {
        fs.ensureDirSync(outputBlogDir);
        const posts = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
        
        posts.forEach(post => {
            const content = fs.readFileSync(path.join(blogDir, post), 'utf-8');
            const title = post.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const html = convertMarkdownToHtml(content, title);
            
            const outputPath = path.join(outputBlogDir, post.replace('.md', '.html'));
            fs.writeFileSync(outputPath, html);
        });
    }
}

// Main build process
console.log('Building site...');
buildPages();
buildBlog();
console.log('Build complete!'); 