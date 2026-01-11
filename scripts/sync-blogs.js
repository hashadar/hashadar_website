const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const BLOG_REPO_PATH = process.env.BLOG_REPO_PATH || path.join(process.cwd(), 'temp-blog-repo');
const BLOGS_FOLDER_NAME = process.env.BLOGS_FOLDER_NAME || 'Blog';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'blog');
const IMAGES_SOURCE_DIR = path.join(BLOG_REPO_PATH, 'Images');
const IMAGES_OUTPUT_DIR = path.join(process.cwd(), 'public', 'img');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_OUTPUT_DIR)) {
  fs.mkdirSync(IMAGES_OUTPUT_DIR, { recursive: true });
}

const blogsSourcePath = path.join(BLOG_REPO_PATH, BLOGS_FOLDER_NAME);

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Generate a URL-safe slug from a file path
 * Uses flatten strategy: filename as slug, with path prefix if in subdirectory
 */
function generateSlug(filePath, blogsBasePath) {
  // Get relative path from Blog/ folder
  const relativePath = path.relative(blogsBasePath, filePath);
  const relativeDir = path.dirname(relativePath);
  const fileName = path.basename(filePath, '.md');

  // Make filename URL-safe
  const safeFileName = makeUrlSafe(fileName);

  // If file is directly in Blog/, use filename as slug
  if (relativeDir === '.') {
    return safeFileName;
  }

  // Otherwise, use path prefix + filename
  // Convert path separators to hyphens and make URL-safe
  const pathParts = relativeDir.split(path.sep);
  const pathPrefix = pathParts
    .map((part) => makeUrlSafe(part))
    .filter((part) => part.length > 0)
    .join('-');

  return pathPrefix ? `${pathPrefix}-${safeFileName}` : safeFileName;
}

/**
 * Make a string URL-safe
 */
function makeUrlSafe(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Sync images from Obsidian repo Images/ folder to public/img/
 */
function syncImages() {
  if (!fs.existsSync(IMAGES_SOURCE_DIR)) {
    console.log('Images source directory not found, skipping image sync...');
    return { synced: 0, errors: [] };
  }

  const errors = [];
  let syncedCount = 0;
  const processedImages = new Set();

  try {
    // Get all files from source img directory
    const imageFiles = fs.readdirSync(IMAGES_SOURCE_DIR).filter((file) => {
      const filePath = path.join(IMAGES_SOURCE_DIR, file);
      return fs.statSync(filePath).isFile();
    });

    console.log(`Found ${imageFiles.length} image file(s) to sync`);

    // Copy each image file
    imageFiles.forEach((file) => {
      try {
        const sourcePath = path.join(IMAGES_SOURCE_DIR, file);
        const outputPath = path.join(IMAGES_OUTPUT_DIR, file);
        fs.copyFileSync(sourcePath, outputPath);
        processedImages.add(file);
        syncedCount++;
      } catch (error) {
        errors.push(`Error copying image ${file}: ${error.message}`);
      }
    });

    // Note: We don't cleanup "orphaned" images because portfolio images 
    // (committed to git) share the same directory and should not be deleted
  } catch (error) {
    errors.push(`Error syncing images: ${error.message}`);
  }

  return { synced: syncedCount, errors };
}

/**
 * Main sync function
 */
function syncBlogs() {
  console.log('Starting blog sync...');
  console.log(`Blog repo path: ${BLOG_REPO_PATH}`);
  console.log(`Blogs folder: ${BLOGS_FOLDER_NAME}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Full blogs source path: ${blogsSourcePath}`);

  // Check if blog repo exists
  if (!fs.existsSync(BLOG_REPO_PATH)) {
    console.error(`Error: Blog repository not found at ${BLOG_REPO_PATH}`);
    console.error(`Current working directory: ${process.cwd()}`);
    process.exit(1);
  }

  // List directory contents for debugging
  try {
    const repoContents = fs.readdirSync(BLOG_REPO_PATH);
    console.log(`Repository contents: ${repoContents.join(', ')}`);
  } catch (err) {
    console.warn(`Could not read repo directory: ${err.message}`);
  }

  // Check if Blogs folder exists (try case variations)
  if (!fs.existsSync(blogsSourcePath)) {
    console.warn(`Warning: Blogs folder not found at ${blogsSourcePath}`);
    
    // Try case-insensitive search
    try {
      const repoContents = fs.readdirSync(BLOG_REPO_PATH);
      const blogsFolder = repoContents.find(item => {
        const itemPath = path.join(BLOG_REPO_PATH, item);
        return fs.statSync(itemPath).isDirectory() && 
               item.toLowerCase() === BLOGS_FOLDER_NAME.toLowerCase();
      });
      
      if (blogsFolder) {
        console.warn(`Found folder with different case: ${blogsFolder}`);
        console.warn(`Please set BLOGS_FOLDER_NAME environment variable to: ${blogsFolder}`);
      }
    } catch (err) {
      // Ignore
    }
    
    console.log('Continuing with empty blog directory...');
    // Clear output directory if source doesn't exist
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      files.forEach((file) => {
        if (file.endsWith('.md')) {
          fs.unlinkSync(path.join(OUTPUT_DIR, file));
        }
      });
    }
    return;
  }

  // Find all markdown files
  const markdownFiles = findMarkdownFiles(blogsSourcePath);
  console.log(`Found ${markdownFiles.length} markdown file(s)`);

  if (markdownFiles.length === 0) {
    console.log('No markdown files found. Clearing output directory...');
    // Clear output directory
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      files.forEach((file) => {
        if (file.endsWith('.md')) {
          fs.unlinkSync(path.join(OUTPUT_DIR, file));
        }
      });
    }
    return;
  }

  // Track slugs and files for conflict detection and cleanup
  const slugToSourcePath = new Map();
  const processedFiles = new Set();
  const errors = [];

  // First pass: collect all files and detect conflicts
  markdownFiles.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Basic frontmatter validation (check if it starts with ---)
      if (!content.trim().startsWith('---')) {
        errors.push(`Invalid frontmatter in ${filePath}: Missing frontmatter delimiter`);
        return;
      }

      // Generate slug (already URL-safe)
      let slug = generateSlug(filePath, blogsSourcePath);

      // Check for conflicts and resolve by adding numeric suffix if needed
      let originalSlug = slug;
      let conflictCounter = 1;
      while (slugToSourcePath.has(slug)) {
        slug = `${originalSlug}-${conflictCounter}`;
        conflictCounter++;
      }

      slugToSourcePath.set(slug, filePath);
    } catch (error) {
      errors.push(`Error reading ${filePath}: ${error.message}`);
    }
  });

  // Second pass: copy files to output directory
  let successCount = 0;
  slugToSourcePath.forEach((sourcePath, slug) => {
    try {
      const outputPath = path.join(OUTPUT_DIR, `${slug}.md`);
      fs.copyFileSync(sourcePath, outputPath);
      processedFiles.add(`${slug}.md`);
      successCount++;
    } catch (error) {
      errors.push(`Error copying ${sourcePath} to ${slug}.md: ${error.message}`);
    }
  });

  // Third pass: cleanup orphaned files (files in output not in source)
  if (fs.existsSync(OUTPUT_DIR)) {
    const outputFiles = fs.readdirSync(OUTPUT_DIR).filter((file) => file.endsWith('.md'));
    outputFiles.forEach((file) => {
      if (!processedFiles.has(file)) {
        try {
          fs.unlinkSync(path.join(OUTPUT_DIR, file));
          console.log(`Removed orphaned file: ${file}`);
        } catch (error) {
          errors.push(`Error removing orphaned file ${file}: ${error.message}`);
        }
      }
    });
  }

  // Sync images from Obsidian repo
  console.log('\n=== Syncing Images ===');
  const imageSyncResult = syncImages();
  console.log(`Successfully synced: ${imageSyncResult.synced} image(s)`);
  if (imageSyncResult.errors.length > 0) {
    errors.push(...imageSyncResult.errors);
  }

  // Summary
  console.log('\n=== Sync Summary ===');
  console.log(`Successfully synced: ${successCount} blog post(s)`);
  console.log(`Successfully synced: ${imageSyncResult.synced} image(s)`);
  console.log(`Total errors: ${errors.length}`);
  
  if (successCount > 0) {
    console.log('\nSynced blog posts:');
    slugToSourcePath.forEach((sourcePath, slug) => {
      console.log(`  - ${slug}.md (from ${path.relative(BLOG_REPO_PATH, sourcePath)})`);
    });
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('Blog sync completed successfully!');
  
  // Verify output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    const outputFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.md'));
    console.log(`Output directory contains ${outputFiles.length} .md file(s)`);
  }
}

// Run sync
try {
  syncBlogs();
} catch (error) {
  console.error('Fatal error during blog sync:', error);
  process.exit(1);
}

