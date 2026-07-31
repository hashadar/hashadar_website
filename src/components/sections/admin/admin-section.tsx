'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AdminSignOutButton,
  RequireSiteAuth,
} from '@/components/auth/require-site-auth';
import { Button, Container, Heading, Section, Text } from '@/components/ui';
import { admin } from '@/data';
import {
  createDefaultSiteContentStorage,
  frontmatterFromMarkdown,
  readBlogIndex,
  readPortfolioManifest,
  type BlogIndexEntry,
  type PortfolioManifestEntry,
  type SiteContentStorage,
} from '@/lib/site-content';
import {
  deletePhoto,
  deletePost,
  reorderPhoto,
  upsertPhoto,
  upsertPost,
} from '@/lib/site-content/admin-write';
import { revalidateSiteContent } from '@/lib/site-content/revalidate';

const fieldClassName =
  'mt-2 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]';

export function AdminSection() {
  return (
    <RequireSiteAuth
      checkingLabel={admin.checkingSessionLabel}
      unauthenticatedHeading={admin.unauthenticatedHeading}
      unauthenticatedDescription={admin.unauthenticatedDescription}
      signInLabel={admin.signInLabel}
    >
      <AdminWorkspace />
    </RequireSiteAuth>
  );
}

function AdminWorkspace() {
  const [storage, setStorage] = useState<SiteContentStorage | null>(null);
  const [photos, setPhotos] = useState<PortfolioManifestEntry[]>([]);
  const [posts, setPosts] = useState<BlogIndexEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (client: SiteContentStorage) => {
    const [manifest, index] = await Promise.all([
      readPortfolioManifest(client),
      readBlogIndex(client),
    ]);
    setPhotos(manifest.photos);
    setPosts(index.posts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const client = await createDefaultSiteContentStorage();
      if (cancelled) {
        return;
      }
      setStorage(client);
      if (client) {
        await refresh(client);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function withClient(
    action: (client: SiteContentStorage) => Promise<void>,
    successMessage: string,
    failureMessage: string,
  ) {
    if (!storage) {
      setError(failureMessage);
      return;
    }
    setError(null);
    setStatus(null);
    try {
      await action(storage);
      await refresh(storage);
      await revalidateSiteContent();
      setStatus(successMessage);
    } catch {
      setError(failureMessage);
    }
  }

  if (loading) {
    return (
      <Section className="py-12">
        <Container>
          <Text variant="muted">{admin.checkingSessionLabel}</Text>
        </Container>
      </Section>
    );
  }

  if (!storage) {
    return (
      <Section className="py-12">
        <Container>
          <Text variant="muted">
            Site Content storage is not configured in this environment.
          </Text>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-12 md:py-16">
      <Container>
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <Heading size="md" as="h1">
              {admin.heading}
            </Heading>
            <Text variant="muted">{admin.description}</Text>
          </div>
          <AdminSignOutButton label={admin.signOutLabel} />
        </div>

        {status ? (
          <p className="mb-4 font-body text-sm text-[var(--foreground)]">{status}</p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mb-4 font-body text-sm text-[var(--destructive,var(--primary))]"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-16 lg:grid-cols-2">
          <PhotosPanel
            photos={photos}
            onSave={(input) =>
              withClient(
                (client) => upsertPhoto({ ...input, storage: client }).then(() => undefined),
                admin.photos.savedLabel,
                admin.photos.errorLabel,
              )
            }
            onDelete={(id) =>
              withClient(
                (client) => deletePhoto(id, client),
                admin.photos.deletedLabel,
                admin.photos.errorLabel,
              )
            }
            onReorder={(id, direction) =>
              withClient(
                (client) => reorderPhoto(id, direction, client),
                admin.photos.savedLabel,
                admin.photos.errorLabel,
              )
            }
          />
          <PostsPanel
            posts={posts}
            onSave={(input) =>
              withClient(
                (client) => upsertPost({ ...input, storage: client }).then(() => undefined),
                admin.posts.savedLabel,
                admin.posts.errorLabel,
              )
            }
            onDelete={(slug) =>
              withClient(
                (client) => deletePost(slug, client),
                admin.posts.deletedLabel,
                admin.posts.errorLabel,
              )
            }
          />
        </div>

        <p className="mt-12 font-body text-sm text-[var(--foreground)]/70">
          <Link href="/" className="underline underline-offset-4">
            Back to site
          </Link>
        </p>
      </Container>
    </Section>
  );
}

function PhotosPanel(props: {
  photos: PortfolioManifestEntry[];
  onSave: (input: {
    id?: string;
    title: string;
    alt: string;
    category?: string;
    location?: string;
    file?: File | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (id: string, direction: 'up' | 'down') => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [alt, setAlt] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await props.onSave({
      id: editingId,
      title,
      alt,
      category,
      location,
      file,
    });
    setTitle('');
    setAlt('');
    setCategory('');
    setLocation('');
    setFile(null);
    setEditingId(undefined);
  }

  return (
    <div className="space-y-6">
      <Heading size="sm" as="h2">
        {admin.photosHeading}
      </Heading>
      <Text variant="muted" size="sm">
        {admin.photos.reorderHint}
      </Text>

      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Field label={admin.photos.titleLabel} value={title} onChange={setTitle} required />
        <Field label={admin.photos.altLabel} value={alt} onChange={setAlt} required />
        <Field label={admin.photos.categoryLabel} value={category} onChange={setCategory} />
        <Field label={admin.photos.locationLabel} value={location} onChange={setLocation} />
        <div>
          <label className="font-body text-sm">{admin.photos.imageLabel}</label>
          <input
            type="file"
            accept="image/webp,.webp"
            className={fieldClassName}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required={!editingId}
          />
        </div>
        <Button type="submit">
          {editingId ? admin.photos.saveLabel : admin.photos.addLabel}
        </Button>
      </form>

      {props.photos.length === 0 ? (
        <Text variant="muted">{admin.photos.emptyLabel}</Text>
      ) : (
        <ul className="space-y-4">
          {props.photos.map((photo, index) => (
            <li
              key={photo.id}
              className="border border-[var(--border)] p-4 space-y-3"
            >
              <Text>
                {photo.title}{' '}
                <span className="text-[var(--foreground)]/60">({photo.id})</span>
              </Text>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(photo.id);
                    setTitle(photo.title);
                    setAlt(photo.alt);
                    setCategory(photo.category ?? '');
                    setLocation(photo.location ?? '');
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => void props.onReorder(photo.id, 'up')}
                >
                  {admin.photos.moveUpLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === props.photos.length - 1}
                  onClick={() => void props.onReorder(photo.id, 'down')}
                >
                  {admin.photos.moveDownLabel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void props.onDelete(photo.id)}
                >
                  {admin.photos.deleteLabel}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostsPanel(props: {
  posts: BlogIndexEntry[];
  onSave: (input: {
    slug: string;
    previousSlug?: string;
    title: string;
    date: string;
    excerpt: string;
    category: string;
    tags: string[];
    author: string;
    markdownText: string;
    heroFile?: File | null;
  }) => Promise<void>;
  onDelete: (slug: string) => Promise<void>;
}) {
  const [slug, setSlug] = useState('');
  const [previousSlug, setPreviousSlug] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');
  const [markdownText, setMarkdownText] = useState('');
  const [heroFile, setHeroFile] = useState<File | null>(null);

  async function onMarkdownFile(file: File | null) {
    if (!file) {
      return;
    }
    const text = await file.text();
    setMarkdownText(text);
    const fm = frontmatterFromMarkdown(text);
    if (fm.title) setTitle(fm.title);
    if (fm.date) setDate(fm.date);
    if (fm.excerpt) setExcerpt(fm.excerpt);
    if (fm.category) setCategory(fm.category);
    if (fm.author) setAuthor(fm.author);
    if (fm.tags.length) setTags(fm.tags.join(', '));
    if (!slug && fm.title) {
      setSlug(
        fm.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      );
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await props.onSave({
      slug,
      previousSlug,
      title,
      date,
      excerpt,
      category,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      author,
      markdownText,
      heroFile,
    });
    setSlug('');
    setPreviousSlug(undefined);
    setTitle('');
    setDate('');
    setExcerpt('');
    setCategory('');
    setTags('');
    setAuthor('');
    setMarkdownText('');
    setHeroFile(null);
  }

  return (
    <div className="space-y-6">
      <Heading size="sm" as="h2">
        {admin.postsHeading}
      </Heading>

      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Field label={admin.posts.slugLabel} value={slug} onChange={setSlug} required />
        <Field label={admin.posts.titleLabel} value={title} onChange={setTitle} required />
        <Field label={admin.posts.dateLabel} value={date} onChange={setDate} required />
        <Field label={admin.posts.excerptLabel} value={excerpt} onChange={setExcerpt} />
        <Field label={admin.posts.categoryLabel} value={category} onChange={setCategory} />
        <Field label={admin.posts.tagsLabel} value={tags} onChange={setTags} />
        <Field label={admin.posts.authorLabel} value={author} onChange={setAuthor} />
        <div>
          <label className="font-body text-sm">{admin.posts.markdownLabel}</label>
          <input
            type="file"
            accept=".md,text/markdown"
            className={fieldClassName}
            onChange={(event) => void onMarkdownFile(event.target.files?.[0] ?? null)}
            required={!previousSlug}
          />
        </div>
        <div>
          <label className="font-body text-sm">{admin.posts.heroLabel}</label>
          <input
            type="file"
            accept="image/webp,.webp"
            className={fieldClassName}
            onChange={(event) => setHeroFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={!previousSlug && !markdownText}>
          {previousSlug ? admin.posts.saveLabel : admin.posts.addLabel}
        </Button>
      </form>

      {props.posts.length === 0 ? (
        <Text variant="muted">{admin.posts.emptyLabel}</Text>
      ) : (
        <ul className="space-y-4">
          {props.posts.map((post) => (
            <li key={post.slug} className="border border-[var(--border)] p-4 space-y-3">
              <Text>
                {post.title}{' '}
                <span className="text-[var(--foreground)]/60">/{post.slug}</span>
              </Text>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviousSlug(post.slug);
                    setSlug(post.slug);
                    setTitle(post.title);
                    setDate(post.date);
                    setExcerpt(post.excerpt);
                    setCategory(post.category);
                    setTags(post.tags.join(', '));
                    setAuthor(post.author);
                    setMarkdownText('');
                  }}
                >
                  Edit metadata
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void props.onDelete(post.slug)}
                >
                  {admin.posts.deleteLabel}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="font-body text-sm">{props.label}</label>
      <input
        className={fieldClassName}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        required={props.required}
      />
    </div>
  );
}
