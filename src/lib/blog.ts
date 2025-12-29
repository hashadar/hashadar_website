import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { toHtml } from 'hast-util-to-html';
import type { Root } from 'hast';
import type { BlogPost } from '@/data/types';

const blogDirectory = path.join(process.cwd(), 'public', 'blog');

export function getAllBlogPosts(): BlogPost[] {
  // Check if blog directory exists
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  // Get all markdown files from the blog directory
  const fileNames = fs.readdirSync(blogDirectory).filter(
    (fileName) => fileName.endsWith('.md')
  );

  const allPostsData = fileNames.map((fileName) => {
    // Remove .md extension to get slug
    const slug = fileName.replace(/\.md$/, '');

    // Read markdown file as string
    const fullPath = path.join(blogDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Parse frontmatter and content
    const { data, content } = matter(fileContents);

    // Process markdown content to HTML with GFM, math, and HTML support
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeKatex);
    
    // Set custom compiler
    processor.compiler = (tree: any) => {
      return toHtml(tree as Root, { allowDangerousHtml: true });
    };
    
    const contentHtml = processor.processSync(content).toString();

    // Combine the data with the slug and content
    return {
      slug,
      frontmatter: {
        title: data.title || '',
        date: data.date || '',
        excerpt: data.excerpt || '',
        category: data.category || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        image: data.image || '',
        author: data.author || '',
        aiGeneratedContent: data['ai-generated-content'] === true || data.aiGeneratedContent === true,
      },
      content: contentHtml,
    } as BlogPost;
  });

  // Sort posts by date (newest first)
  return allPostsData.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime();
    const dateB = new Date(b.frontmatter.date).getTime();
    return dateB - dateA;
  });
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  const fullPath = path.join(blogDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  // Process markdown content to HTML with GFM, math, and HTML support
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex);
  
  // Set custom compiler
  processor.compiler = (tree: any) => {
    return toHtml(tree as Root, { allowDangerousHtml: true });
  };
  
  const contentHtml = processor.processSync(content).toString();

  return {
    slug,
    frontmatter: {
      title: data.title || '',
      date: data.date || '',
      excerpt: data.excerpt || '',
      category: data.category || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      image: data.image || '',
      author: data.author || '',
      aiGeneratedContent: data['ai-generated-content'] === true || data.aiGeneratedContent === true,
    },
    content: contentHtml,
  } as BlogPost;
}

export function getAllBlogSlugs(): string[] {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(blogDirectory).filter(
    (fileName) => fileName.endsWith('.md')
  );

  return fileNames.map((fileName) => fileName.replace(/\.md$/, ''));
}

