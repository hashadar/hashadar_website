'use server';

import { revalidatePath } from 'next/cache';

/** Invalidate public surfaces that read Site Content. */
export async function revalidateSiteContent(): Promise<void> {
  revalidatePath('/');
  revalidatePath('/blog');
  revalidatePath('/portfolio');
  revalidatePath('/blog', 'layout');
}
