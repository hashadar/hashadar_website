import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/job-market-publication';
import type { Schema } from '../../data/resource';
import type { CorpusSnapshotPayload } from '../job-market-analyse/analyse';
import { sanitiseSnapshotPayloadForGuests } from './sanitize';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();
const PUBLICATION_ID = 'current';

export const handler: Schema['getPublishedJobMarketSnapshot']['functionHandler'] =
  async () => {
    const publication = await client.models.LabPublication.get({
      id: PUBLICATION_ID,
    });
    const snapshotId = publication.data?.currentSnapshotId;
    if (!snapshotId) {
      return null;
    }

    const snapshot = await client.models.CorpusSnapshot.get({ id: snapshotId });
    const rawPayload = snapshot.data?.payload;
    if (rawPayload == null) {
      return null;
    }

    if (typeof rawPayload === 'string') {
      try {
        const parsed = JSON.parse(rawPayload) as CorpusSnapshotPayload;
        return sanitiseSnapshotPayloadForGuests(parsed);
      } catch {
        return null;
      }
    }

    return sanitiseSnapshotPayloadForGuests(rawPayload as CorpusSnapshotPayload);
  };
