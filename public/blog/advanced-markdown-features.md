---
title: "Exploring Advanced Markdown Features in Next.js"
date: "2025-12-29"
excerpt: "A comprehensive guide to rendering complex content including images, tables, code blocks, and more in your Next.js blog."
category: "Tutorial"
tags: ["nextjs", "markdown", "tutorial", "web development"]
image: "/img/mangrove_beach.webp"
author: "Hasha Dar"
ai-generated-content: true
---

This blog post demonstrates the full range of markdown features available in our blog system, from basic formatting to complex elements like tables, code blocks, and embedded content.

## Images and Media

### Single Image

Here's a standard image embedded in the content:

![Portrait Photography](/img/20250616-01.webp "Example portrait image")

### Image with Link

You can also wrap images in links:

[![Theatre Performance](/img/20250621-02.webp "Click to view larger")](/img/20250621-02.webp)

## Tables

Tables are great for displaying structured data:

### Simple Table

| Feature | Status | Priority |
|---------|--------|----------|
| Markdown Support | ✅ Complete | High |
| Image Rendering | ✅ Complete | High |
| Table Support | ✅ Complete | Medium |
| Code Highlighting | ✅ Complete | High |
| Syntax Highlighting | 🚧 In Progress | Medium |

### Complex Table with Alignment

| Left Aligned | Center Aligned | Right Aligned | Default |
|:-------------|:--------------:|--------------:|---------|
| This is left | This is center | This is right | This is default |
| Content here | More content | Numbers: 1234 | Text |
| Short | Medium length text | 5678 | More text here |

### Table with Markdown

| Component | Description | Usage |
|-----------|-------------|-------|
| **BlogCard** | Displays blog post preview | Used in grid layout |
| `BlogGrid` | Container for blog cards | Main listing page |
| `getAllBlogPosts()` | Fetches all posts | Server-side function |

## Code Blocks

### JavaScript Example

```javascript
// Blog utility function
export function getAllBlogPosts(): BlogPost[] {
  const fileNames = fs.readdirSync(blogDirectory)
    .filter(fileName => fileName.endsWith('.md'));
  
  return fileNames.map(fileName => {
    const slug = fileName.replace(/\.md$/, '');
    const fileContents = fs.readFileSync(
      path.join(blogDirectory, fileName), 
      'utf8'
    );
    const { data, content } = matter(fileContents);
    return { slug, frontmatter: data, content };
  });
}
```

### TypeScript Example

```typescript
interface BlogPostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  image: string;
  author: string;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  content: string;
}
```

### CSS Example

```css
.blog-content {
  color: var(--foreground);
  line-height: 1.75;
  font-size: 1.125rem;
}

.blog-content h1,
.blog-content h2 {
  font-family: var(--font-display);
  font-weight: 700;
  margin-top: 2em;
}
```

### Bash/Shell Example

```bash
# Install dependencies
npm install gray-matter remark remark-html date-fns

# Run development server
npm run dev

# Build for production
npm run build
```

### JSON Example

```json
{
  "title": "Exploring Advanced Markdown Features",
  "date": "2025-01-20",
  "tags": ["nextjs", "markdown", "tutorial"],
  "category": "Web Development"
}
```

## Lists

### Unordered Lists

- First item
- Second item
  - Nested item one
  - Nested item two
    - Deeply nested item
- Third item
- Fourth item with **bold text** and *italic text*

### Ordered Lists

1. First step in the process
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step
4. Final step

### Mixed Lists

- Main point one
  1. Sub-point A
  2. Sub-point B
- Main point two
  - Nested bullet
  - Another nested bullet

## Blockquotes

### Simple Blockquote

> This is a simple blockquote. It can contain multiple paragraphs and various formatting.

### Blockquote with Multiple Paragraphs

> This is the first paragraph of a blockquote.
> 
> This is the second paragraph, continuing the quote.
> 
> And here's a third paragraph for good measure.

### Nested Blockquotes

> This is the outer blockquote.
> 
> > This is a nested blockquote inside the outer one.
> > 
> > You can nest them multiple levels if needed.

## Text Formatting

### Emphasis

This paragraph contains *italic text*, **bold text**, ***bold and italic text***, and `inline code`.

### Strikethrough

This text has ~~strikethrough~~ formatting applied.

### Links

- [Internal link to homepage](/)
- [Link to portfolio](/portfolio)
- [External link to Next.js](https://nextjs.org)
- [Link with title](https://nextjs.org "Next.js Homepage")

## Horizontal Rules

You can use horizontal rules to separate sections:

---

## Headings Hierarchy

# Heading 1 (H1)

## Heading 2 (H2)

### Heading 3 (H3)

#### Heading 4 (H4)

##### Heading 5 (H5)

###### Heading 6 (H6)

## Task Lists

- [x] Completed task one
- [x] Completed task two
- [ ] Incomplete task one
- [ ] Incomplete task two
- [x] Another completed task

## Definition Lists

Term 1
: Definition for term 1

Term 2
: Definition for term 2
: Another definition for term 2

## Mathematical Expressions (if supported)

Inline math: $E = mc^2$

Block math:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## HTML Elements

Since markdown supports HTML, you can embed HTML directly:

<div style="background: var(--muted); padding: 1rem; border-radius: 0.5rem; margin: 1.5rem 0;">
  <h4 style="margin-top: 0;">Custom HTML Block</h4>
  <p>This is a custom HTML div with inline styles. Useful for special formatting needs.</p>
</div>

### HTML Table

<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background: var(--muted);">
      <th style="padding: 0.75rem; border: 1px solid var(--border);">Name</th>
      <th style="padding: 0.75rem; border: 1px solid var(--border);">Type</th>
      <th style="padding: 0.75rem; border: 1px solid var(--border);">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 0.75rem; border: 1px solid var(--border);">BlogCard</td>
      <td style="padding: 0.75rem; border: 1px solid var(--border);">Component</td>
      <td style="padding: 0.75rem; border: 1px solid var(--border);">Displays blog post preview</td>
    </tr>
    <tr>
      <td style="padding: 0.75rem; border: 1px solid var(--border);">getAllBlogPosts</td>
      <td style="padding: 0.75rem; border: 1px solid var(--border);">Function</td>
      <td style="padding: 0.75rem; border: 1px solid var(--border);">Fetches all blog posts</td>
    </tr>
  </tbody>
</table>

## Conclusion

This blog post demonstrates the wide range of markdown features available in our blog system. From simple text formatting to complex tables and code blocks, you can create rich, engaging content.

### Key Takeaways

1. **Images** - Support for standard markdown image syntax
2. **Tables** - Full table support with alignment options
3. **Code Blocks** - Syntax highlighting for multiple languages
4. **Lists** - Ordered, unordered, and nested lists
5. **Blockquotes** - For highlighting important information
6. **HTML** - Direct HTML embedding for advanced formatting

Feel free to experiment with these features in your own blog posts!

