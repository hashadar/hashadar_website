# Site

Public marketing site, site-wide sign-in, Admin for content, and Labs as separate gated products. Distinct from Job OS.

## Language

### Identity and access

**Site Admin**:
The invited human who may sign in to the site. Single account for now; not a public registrant.
_Avoid_: Owner, admin user (as a second noun), customer, member

**Sign-in**:
The site-wide authentication experience at `/login` that establishes a Site Admin session. After success, the Site Admin returns to the `next` path when present and safe; otherwise they land on Admin. Sign-in and Admin are not marketing surfaces (not indexed, not in the sitemap). Sign-out is offered from Admin and Lab shells; after sign-out the Site Admin returns to the public home.
_Avoid_: Owner sign in, Lab login, login as a Lab-owned flow, footer sign-out on marketing chrome

**Admin**:
The Site Admin’s content workspace at `/admin` for Posts, portfolio Photos, and the Home Photo. Not a Lab. Marketing page copy in the repo data layer is out of scope for Admin v1.
_Avoid_: Labs admin, CMS (as the product name), owner console, page-copy CMS (v1)

**Lab**:
A standalone gated product under `/labs/...` that consumes Sign-in but has its own shell and data. Examples: Job OS; future labs.
_Avoid_: treating Admin as a Lab, treating Labs as the auth hub

### Content

**Site Content**:
Public blog, portfolio, and home photography material managed via Admin (and optional storage-console escape hatch), stored in the Site content store. Public pages read it live (not only at deploy time). Absence of content is a valid state (empty public lists / no Home Photo).
_Avoid_: Job OS Body, vault sync as the source of truth, deploy-gated publishing as the only path, committing production Posts/Photos to the site repo

**Post**:
A blog article ready for the public site: list metadata plus a markdown body, with an optional hero image. Only finished articles are stored as Site Content; unfinished writing is not a Site concept. The Site Admin may replace a Post’s markdown or hero image, update its list metadata, change its slug, or delete it from Site Content. In-body images inside markdown are out of scope for this stage. List/card/sitemap fields are authoritative on the Post’s index entry; markdown may carry frontmatter only as an import convenience. When a Post has no hero, the public site uses a designated fallback image.
_Avoid_: Draft (as Site Content), JobDescription, LabPublication, unpublish (as a separate state), body image pipeline (v1), frontmatter as the live source of truth

**Fallback image**:
The designated image shown when a Post has no hero (cards and related presentation). Lives as site chrome in the site repo (`public/`), not as an Admin-managed Photo.
_Avoid_: requiring every Post to upload a hero, per-Post custom fallbacks (v1), managing the fallback as portfolio Site Content

**Post index**:
The Site Content catalogue of Posts (e.g. `blog/index.json`): slug, title, date, excerpt, and related list fields the public site reads for listings and sitemap.
_Avoid_: scanning every markdown object to build the public index, frontmatter-only catalogue

**Slug**:
The URL key for a Post (`/blog/{slug}`). The Site Admin may change it when the title or identity of the article changes in a meaningful way. The previous slug ceases to exist; there is no redirect from old slugs.
_Avoid_: filename as a distinct public concept, id-only URLs for v1, slug redirect, slug history

**Photo**:
A portfolio photograph entry: display metadata plus a single WebP image object. The Site Admin may add, replace, reorder, edit metadata, or delete Photos. Manifest order is the public portfolio display order only.
_Avoid_: MediaAsset as the public noun (implementation detail), Body, multi-format originals in Site Content, derived variant pipeline (v1), treating the first Photo as the home teaser

**Home Photo**:
The single photograph shown in the home photography section. Distinct Site Content from portfolio Photos — not derived from portfolio order or identity. Optional; when absent the home photography section has no image.
_Avoid_: featured portfolio Photo, first Photo as teaser, Fallback image (that is for Posts only)

**WebP**:
The only image format accepted into Site Content (portfolio Photos, Home Photo, and Post heroes).
_Avoid_: JPEG/PNG uploads as first-class Site Content, automatic transcode pipeline (v1)
