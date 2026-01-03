---
title: Obsidian Blog Integration Architecture
date: 2026-01-03
excerpt: Architecture documentation for integrating a private Obsidian vault repository with a Next.js website using webhook-triggered builds on AWS Amplify.
category: Web Development
tags:
  - architecture
  - obsidian
  - aws-amplify
  - webhooks
  - git
  - automation
image: /img/blog/logan-voss-SMCQQlSYx4s-unsplash.jpg
author: Hasha Dar
ai-generated-content: true
---

This document outlines the architecture for connecting a private Obsidian vault repository to a Next.js website hosted on AWS Amplify. The system uses webhook-triggered builds to automatically refresh blog content when the Obsidian vault is updated, maintaining a single source of truth for blog posts while keeping the writing workflow separate from the website codebase.

# Overview

The integration allows blog posts written in Obsidian (stored in a private Git repository) to be automatically synced to the website whenever the main branch is updated. This architecture maintains separation of concerns: blog content lives in the Obsidian vault repository, while the website codebase remains focused on presentation and functionality.

## Key Requirements

- **Single Source of Truth**: Blog posts are written and managed in Obsidian vault repository
- **Automatic Updates**: Website automatically refreshes when blog repo is updated
- **Private Repository**: Obsidian vault repository is private and requires authentication
- **Nested Folder Structure**: Blog posts can exist in nested folders under `Blogs/` for organization
- **Webhook Triggered**: Updates to main branch trigger automatic website rebuilds

# Architecture Components

## 1. Repository Structure

### Obsidian Vault Repository (Private)

```
obsidian-vault/
├── Blogs/                    # Top-level folder (required)
│   ├── post-1.md            # Direct child - included
│   ├── Technology/
│   │   ├── post-2.md        # Nested - included
│   │   └── AI/
│   │       └── post-3.md    # Deeply nested - included
│   └── Photography/
│       └── post-4.md        # Nested - included
└── Other folders/            # Not included (outside Blogs/)
```

**Key Points:**
- Only markdown files (`.md`) under the `Blogs/` folder are processed
- Nested folder structure is preserved for organization in Obsidian
- Files outside `Blogs/` are ignored

### Main Website Repository

```
hashadar_website/
├── .amplify/                 # Amplify configuration
├── scripts/
│   └── sync-blogs.js        # Blog synchronization script
├── content/
│   └── blogs/               # Temporary location for cloned blogs
├── public/
│   └── blog/                # Final location (populated from sync script)
├── amplify.yml              # Amplify build configuration
└── src/
    └── lib/
        └── blog.ts          # Blog processing logic (updated for recursive scanning)
```

## 2. Authentication Strategy

Since the Obsidian vault repository is private, authentication is required during the build process. The recommended approach uses **SSH Deploy Keys** for secure, read-only access**.

### SSH Deploy Key Setup

1. **Generate SSH Key Pair**
   ```bash
   ssh-keygen -t ed25519 -C "amplify-deploy-key" -f ~/.ssh/amplify_blog_deploy_key
   ```

2. **Add Public Key to Blog Repository**
   - Go to blog repository settings
   - Navigate to "Deploy keys" section
   - Add public key (`amplify_blog_deploy_key.pub`) with read-only access

3. **Store Private Key in Amplify**
   - Add private key to Amplify environment variables as `SSH_PRIVATE_KEY`
   - Mark as sensitive/encrypted

### Alternative: GitHub Personal Access Token

If SSH is not preferred:
- Create GitHub Personal Access Token with `repo` scope
- Store in Amplify environment variables as `GITHUB_TOKEN`
- Use HTTPS URL for cloning: `https://${GITHUB_TOKEN}@github.com/username/repo.git`

## 3. Webhook Configuration

### GitHub Webhook Setup

The webhook triggers an Amplify rebuild when the blog repository is updated.

**Webhook Configuration:**
- **URL**: `https://webhooks.amplify.us-east-1.amazonaws.com/prod/webhooks?id=<APP_ID>&token=<WEBHOOK_TOKEN>`
- **Content Type**: `application/json`
- **Events**: 
  - `push` (when code is pushed)
  - Filter: Only trigger on `main` branch

**How to Get Webhook URL:**
1. Go to AWS Amplify Console
2. Select your app
3. Navigate to "App settings" → "General"
4. Find "Webhook" section
5. Copy the webhook URL (or create new webhook)

**Webhook Payload Filter (Optional):**
Configure webhook to only trigger on main branch:
```json
{
  "ref": "refs/heads/main"
}
```

### Webhook Flow

```
┌─────────────────────────────────────────┐
│ Obsidian Vault Repository (GitHub)      │
│ Push to main branch                      │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ GitHub Webhook                           │
│ Detects push event                       │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ AWS Amplify                             │
│ Receives webhook                        │
│ Triggers new build                      │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Build Process                            │
│ (See Build Process Flow below)          │
└─────────────────────────────────────────┘
```

## 4. Build Process Flow

The complete build process runs automatically when triggered by webhook or manual deployment:

```
┌─────────────────────────────────────────────────────────┐
│ Pre-Build Phase                                         │
│                                                         │
│ 1. Setup SSH Authentication                            │
│    - Configure SSH key from environment variable       │
│    - Add GitHub to known_hosts                         │
│                                                         │
│ 2. Clone Blog Repository                               │
│    - Clone private repo to temp-blog-repo/             │
│    - Use shallow clone (--depth 1) for speed          │
│                                                         │
│ 3. Run Blog Sync Script                                │
│    - Recursively scan Blogs/ folder                    │
│    - Find all .md files (any nesting level)           │
│    - Generate unique slugs from file paths             │
│    - Copy files to public/blog/                        │
│    - Handle slug conflicts                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Build Phase                                             │
│                                                         │
│ 1. Next.js Build                                        │
│    - Reads blog posts from public/blog/                │
│    - Processes markdown → HTML                         │
│    - Generates static pages                            │
│                                                         │
│ 2. Static Generation                                    │
│    - generateStaticParams() creates routes             │
│    - All blog posts pre-rendered                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Deploy Phase                                            │
│                                                         │
│ 1. Deploy Static Site                                   │
│    - Upload to CDN                                      │
│    - Invalidate cache                                  │
│                                                         │
│ 2. Cleanup                                             │
│    - Remove temporary files                            │
│    - Clear sensitive data                              │
└─────────────────────────────────────────────────────────┘
```

## 5. Amplify Build Configuration

The `amplify.yml` file configures the build process:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        # Setup SSH for private repo access
        - mkdir -p ~/.ssh
        - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
        - chmod 600 ~/.ssh/id_rsa
        - ssh-keyscan github.com >> ~/.ssh/known_hosts
        
        # Clone blog repository
        - |
          if [ -d "temp-blog-repo" ]; then
            cd temp-blog-repo
            git pull origin main
            cd ..
          else
            git clone --depth 1 git@github.com:username/obsidian-vault.git temp-blog-repo
          fi
        
        # Run blog sync script
        - node scripts/sync-blogs.js
        
        # Install dependencies
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - temp-blog-repo/**/*  # Cache the blog repo for faster builds
```

**Key Configuration Points:**
- SSH setup happens in preBuild phase
- Blog repo is cached between builds for performance
- Sync script runs before Next.js build
- Standard Next.js build process follows

## 6. Blog Sync Script Architecture

The sync script (`scripts/sync-blogs.js`) handles the core logic of finding and copying blog posts.

### Script Responsibilities

1. **Repository Access**
   - Read blog repository path from environment or config
   - Verify `Blogs/` folder exists
   - Handle missing repository gracefully

2. **Recursive File Discovery**
   - Walk `Blogs/` directory tree recursively
   - Filter only `.md` files
   - Collect all markdown files regardless of nesting depth

3. **Slug Generation (Flatten Strategy)**
   - Use filename as slug (e.g., `post.md` → `post`)
   - Detect conflicts when same filename exists in multiple folders
   - Resolve conflicts by prefixing with folder path (e.g., `technology-post`)
   - Ensure all slugs are URL-safe and unique

4. **File Processing**
   - Read markdown file content
   - Validate frontmatter structure
   - Copy to `public/blog/` with appropriate slug
   - Handle file overwrites and conflicts

5. **Cleanup**
   - Remove orphaned files (files in `public/blog/` not in source)
   - Log summary of synced posts
   - Report errors for invalid files

### Slug Generation Strategy

**Chosen Strategy: Flatten**

The system uses a **flatten** slug generation strategy:
- `Blogs/Technology/AI/post.md` → `post.md` (if filename is unique)
- If conflict detected (same filename in different folders): `technology-ai-post.md`
- Simpler, cleaner URLs that match current `blog.ts` implementation
- Requires conflict detection logic to handle duplicate filenames

**Conflict Resolution Logic:**
When multiple files share the same name (e.g., `post.md` in different folders), the slug incorporates the folder path:
- `Blogs/Technology/post.md` → `technology-post.md`
- `Blogs/Photography/post.md` → `photography-post.md`
- `Blogs/Technology/AI/post.md` → `technology-ai-post.md`

**Implementation Consideration:**
The current `blog.ts` uses filename as slug, which aligns perfectly with the flatten strategy. The sync script will:
1. Attempt to use filename as slug
2. Detect conflicts by tracking used slugs
3. Fall back to path-prefixed slug when conflicts occur
4. Ensure all slugs are URL-safe and unique

## 7. Environment Variables

Required environment variables in AWS Amplify Console:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SSH_PRIVATE_KEY` | Private SSH key for blog repo access | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Yes |
| `BLOG_REPO_URL` | Git URL of Obsidian vault repo | `git@github.com:username/obsidian-vault.git` | Yes |
| `BLOG_REPO_BRANCH` | Branch to clone | `main` | No (default: main) |
| `BLOGS_FOLDER_NAME` | Folder name containing blogs | `Blogs` | No (default: Blogs) |

**Security Notes:**
- Mark sensitive variables as encrypted
- Never commit secrets to repository
- Rotate SSH keys periodically
- Use least-privilege access (read-only deploy key)

## 8. Blog Processing Logic Updates

The existing `blog.ts` file needs updates to support the new architecture:

### Current Limitations

- Only scans `public/blog/` directory (flat structure)
- Uses filename directly as slug
- No recursive directory scanning

### Required Updates

1. **Recursive Directory Scanning**
   - Update `getAllBlogPosts()` to recursively scan subdirectories
   - Find all `.md` files regardless of nesting

2. **Slug Handling**
   - Current implementation already uses filename as slug (compatible with flatten strategy)
   - Ensure `getBlogPostBySlug()` can find files by their flattened slug
   - No changes needed if sync script handles slug generation correctly

3. **Path Resolution**
   - Map slugs back to file paths for reading
   - Handle both flat and nested structures
   - Maintain backward compatibility if possible

## 9. Update Workflow

### Publishing a New Blog Post

1. **Write in Obsidian**
   - Create new markdown file anywhere under `Blogs/` folder
   - Add frontmatter with required metadata:
     ```yaml
     ---
     title: Your Blog Post Title
     date: 2026-01-15
     excerpt: Brief description
     category: Category Name
     tags:
       - tag1
       - tag2
     image: /img/blog/image.jpg
     author: Hasha Dar
     ai-generated-content: false
     ---
     ```

2. **Commit and Push**
   - Commit changes to Obsidian vault repository
   - Push to `main` branch

3. **Automatic Trigger**
   - GitHub webhook detects push
   - Amplify receives webhook
   - Build process starts automatically

4. **Build and Deploy**
   - Blog sync script processes new post
   - Next.js generates static pages
   - Site updates with new content

### Manual Rebuild

If automatic webhook fails or manual refresh needed:
- Go to AWS Amplify Console
- Select app → "Redeploy this version" or "Start new deployment"
- Build process runs with latest blog content

## 10. Error Handling & Edge Cases

### Scenarios to Handle

| Scenario | Handling Strategy |
|----------|-------------------|
| Blog repo clone fails | Build fails with clear error message, log SSH/auth issues |
| No "Blogs" folder | Log warning, continue build (empty blog) |
| No .md files found | Log info, continue build (empty blog) |
| Invalid frontmatter | Skip file, log error, continue with other files |
| Duplicate slugs (same filename in different folders) | Use path-prefixed slug (e.g., `technology-post.md`), log conflict resolution |
| Large repository | Use shallow clone, cache between builds |
| SSH key expired | Build fails, requires key rotation |
| Webhook not configured | Manual rebuilds still work |

### Validation Checks

The sync script should validate:
- Frontmatter structure matches expected format
- Required fields present (title, date)
- Date format valid
- Slug generation produces URL-safe strings
- File paths are valid and accessible

## 11. Performance Optimizations

### Build Time Optimizations

- **Shallow Clone**: Use `--depth 1` to clone only latest commit
- **Caching**: Cache `temp-blog-repo/` between builds
- **Incremental Sync**: Only process changed files (compare git hashes)
- **Parallel Processing**: Process multiple files concurrently if many posts

### Runtime Performance

- Current static generation is optimal (no runtime API calls)
- All content pre-rendered at build time
- No impact on page load performance
- CDN caching handles traffic efficiently

## 12. Security Considerations

### Repository Access

- **Deploy Keys**: Use read-only deploy keys (not full account access)
- **Key Rotation**: Rotate SSH keys periodically
- **Least Privilege**: Only grant access to blog repository
- **Secrets Management**: Store keys in Amplify environment variables (encrypted)

### Build Security

- **Temporary Files**: Clean up sensitive data after build
- **Log Sanitization**: Don't log sensitive information
- **Error Messages**: Don't expose internal paths or credentials in errors

### Content Security

- **Frontmatter Validation**: Validate all frontmatter to prevent injection
- **Markdown Sanitization**: Current markdown processor handles this
- **File Size Limits**: Consider limits on individual file sizes

## 13. Monitoring & Debugging

### Build Logs

Monitor Amplify build logs for:
- SSH connection success/failure
- Repository clone status
- Sync script execution
- File processing errors
- Build completion status

### Common Issues

**Issue: Build fails with SSH error**
- Check SSH key is correctly set in environment variables
- Verify deploy key is added to blog repository
- Check key format (should include header/footer)

**Issue: No blog posts appear**
- Verify `Blogs/` folder exists in repository
- Check sync script logs for file discovery
- Verify files have `.md` extension
- Check frontmatter is valid

**Issue: Webhook not triggering**
- Verify webhook URL is correct
- Check webhook is configured for `push` events
- Verify webhook secret/token if required
- Test webhook manually from GitHub

## 14. Alternative Approaches Considered

### Git Submodule

**Pros:**
- Native git integration
- Version control of blog content

**Cons:**
- Requires submodule management
- More complex setup
- Harder to trigger automatic updates

**Decision:** Not chosen - webhook approach is simpler and more flexible

### GitHub Actions Pre-Build

**Pros:**
- Processes files before Amplify build
- No private repo access needed in Amplify

**Cons:**
- More moving parts
- Requires GitHub Actions setup
- Additional repository for processed files

**Decision:** Not chosen - direct integration is cleaner

### API-Based Approach

**Pros:**
- Real-time updates possible
- No build required for new posts

**Cons:**
- Requires runtime API calls
- More complex architecture
- Potential performance impact

**Decision:** Not chosen - static generation is preferred for performance

## 15. Implementation Checklist

### Phase 1: Setup & Configuration

- [ ] Generate SSH key pair for blog repository
- [ ] Add public key as deploy key to blog repository
- [ ] Store private key in Amplify environment variables
- [ ] Create `amplify.yml` build configuration
- [ ] Create `scripts/sync-blogs.js` script
- [ ] Configure GitHub webhook in Amplify

### Phase 2: Code Updates

- [ ] Update `blog.ts` for recursive directory scanning
- [ ] Implement slug generation logic
- [ ] Update `getBlogPostBySlug()` for path-based slugs
- [ ] Add error handling for missing files
- [ ] Add validation for frontmatter structure

### Phase 3: Testing

- [ ] Test sync script locally with blog repository
- [ ] Test SSH authentication in Amplify build
- [ ] Verify nested folder posts are discovered
- [ ] Test slug generation and conflict handling
- [ ] Test webhook trigger from GitHub
- [ ] Verify blog posts render correctly

### Phase 4: Deployment

- [ ] Deploy to Amplify staging (if available)
- [ ] Test complete workflow end-to-end
- [ ] Verify webhook triggers builds correctly
- [ ] Monitor build logs for issues
- [ ] Deploy to production
- [ ] Document any customizations

## 16. Future Enhancements

Potential improvements to consider:

- **Incremental Updates**: Only process changed files using git diff
- **Preview Builds**: Support preview deployments for draft posts
- **Content Validation**: Stricter frontmatter validation with schema
- **Image Optimization**: Automatic image optimization for blog images
- **RSS Feed**: Generate RSS feed from blog posts
- **Search Index**: Build search index during sync
- **Analytics**: Track which posts are synced and when

## Conclusion

This architecture provides a clean separation between content creation (Obsidian) and website presentation (Next.js), while maintaining automatic synchronization through webhook-triggered builds. The system is designed to be reliable, secure, and performant, with proper error handling and monitoring capabilities.

The webhook approach ensures that blog content updates are reflected on the website automatically, without manual intervention, while keeping the Obsidian vault as the single source of truth for all blog content.

---

**Last Updated**: January 3, 2026  
**Status**: Architecture Documentation - Implementation Pending

