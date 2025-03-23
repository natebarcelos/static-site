const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

// Site Configuration
const config = {
    websiteName: "Nate's Website"
};

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

// Function to extract title from markdown content
function extractTitle(content) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1] : '';
}

// Function to get latest blog posts
function getLatestBlogPosts(limit = 3) {
    const blogDir = path.join(CONTENT_DIR, 'blog');
    if (!fs.existsSync(blogDir)) return [];

    return fs.readdirSync(blogDir)
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
            const { frontmatter, content: markdownContent } = extractFrontmatter(content);
            const title = extractTitle(markdownContent);
            const url = `/blog/${file.replace('.md', '.html')}`;
            return { 
                title, 
                url, 
                date: frontmatter.date || '1970-01-01'
            };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
}

// Function to convert markdown to HTML
function convertMarkdownToHtml(markdown, title, date) {
    const html = marked.parse(markdown);
    const dateHtml = date ? `<div class="post-date">${new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}</div>` : '';
    
    let processedTemplate = baseTemplate
        .replace(/{{websiteName}}/g, config.websiteName)
        .replace('{{title}}', title)
        .replace('{{content}}', `<div class="markdown-content">${dateHtml}${html}</div>`);
    
    return processedTemplate;
}

// Function to generate blog listing HTML
function generateBlogListing() {
    const blogDir = path.join(CONTENT_DIR, 'blog');
    if (!fs.existsSync(blogDir)) return '';

    const posts = fs.readdirSync(blogDir)
        .filter(file => file.endsWith('.md'))
        .map(file => {
            const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
            const { frontmatter, content: markdownContent } = extractFrontmatter(content);
            const title = extractTitle(markdownContent);
            const url = `/blog/${file.replace('.md', '.html')}`;
            return { 
                title, 
                url, 
                date: frontmatter.date || '1970-01-01'
            };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    return posts
        .map(post => {
            const date = new Date(post.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            return `<li><a href="${post.url}">${post.title}</a><span class="post-date">${date}</span></li>`;
        })
        .join('\n');
}

// Function to generate latest blog posts HTML for index page
function generateLatestBlogPosts() {
    const posts = getLatestBlogPosts(3);
    return posts
        .map(post => `<li><a href="${post.url}">${post.title}</a></li>`)
        .join('\n');
}

// Build pages
function buildPages() {
    const pages = fs.readdirSync(CONTENT_DIR)
        .filter(file => file.endsWith('.md'));

    pages.forEach(page => {
        const content = fs.readFileSync(path.join(CONTENT_DIR, page), 'utf-8');
        const { frontmatter, content: markdownContent } = extractFrontmatter(content);
        const title = page.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Handle blog listing page specially
        if (page === 'blog.md') {
            const blogList = generateBlogListing();
            const processedContent = markdownContent.replace('{{blog_list}}', `<ul class="blog-list">\n${blogList}\n</ul>`);
            const html = convertMarkdownToHtml(processedContent, title, frontmatter.date);
            const outputPath = path.join(OUTPUT_DIR, page.replace('.md', '.html'));
            fs.writeFileSync(outputPath, html);
        } else {
            // Handle index page specially
            if (page === 'index.md') {
                const latestPosts = generateLatestBlogPosts();
                const processedContent = markdownContent.replace('{{latest_posts}}', `<ul class="blog-list">\n${latestPosts}\n</ul>`);
                const html = convertMarkdownToHtml(processedContent, title, frontmatter.date);
                const outputPath = path.join(OUTPUT_DIR, page.replace('.md', '.html'));
                fs.writeFileSync(outputPath, html);
            } else {
                const html = convertMarkdownToHtml(markdownContent, title, frontmatter.date);
                const outputPath = path.join(OUTPUT_DIR, page.replace('.md', '.html'));
                fs.writeFileSync(outputPath, html);
            }
        }
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
            const { frontmatter, content: markdownContent } = extractFrontmatter(content);
            const title = extractTitle(markdownContent);
            const html = convertMarkdownToHtml(markdownContent, title, frontmatter.date);
            
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