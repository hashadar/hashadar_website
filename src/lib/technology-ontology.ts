export type TechnologyEntry = {
  canonical: string;
  aliases: string[];
};

export type MatchTechnologiesOptions = {
  dictionary?: TechnologyEntry[];
};

export const FINSERV_AI_TECHNOLOGY_DICTIONARY: TechnologyEntry[] = [
  { canonical: 'python', aliases: ['python'] },
  { canonical: 'pandas', aliases: ['pandas'] },
  { canonical: 'pytorch', aliases: ['pytorch', 'torch'] },
  { canonical: 'bedrock', aliases: ['bedrock', 'amazon bedrock', 'aws bedrock'] },
  {
    canonical: 'sagemaker',
    aliases: ['sagemaker', 'amazon sagemaker', 'aws sagemaker'],
  },
  { canonical: 'sql', aliases: ['sql'] },
  { canonical: 'snowflake', aliases: ['snowflake'] },
  { canonical: 'dbt', aliases: ['dbt'] },
  { canonical: 'spark', aliases: ['spark', 'apache spark', 'pyspark'] },
  { canonical: 'kafka', aliases: ['kafka', 'apache kafka'] },
  { canonical: 'terraform', aliases: ['terraform'] },
  { canonical: 'kubernetes', aliases: ['kubernetes', 'k8s'] },
  {
    canonical: 'kubernetes aks',
    aliases: ['kubernetes aks', 'azure kubernetes service', 'aks'],
  },
  { canonical: 'docker', aliases: ['docker'] },
  { canonical: 'langchain', aliases: ['langchain'] },
  {
    canonical: 'rag',
    aliases: [
      'rag',
      'retrieval-augmented generation',
      'retrieval augmented generation',
    ],
  },
  { canonical: 'tableau', aliases: ['tableau'] },
  { canonical: 'power bi', aliases: ['power bi', 'powerbi'] },
  { canonical: 'databricks', aliases: ['databricks'] },
  { canonical: 'airflow', aliases: ['airflow', 'apache airflow'] },
  { canonical: 'looker', aliases: ['looker'] },
  { canonical: 'scikit-learn', aliases: ['scikit-learn', 'sklearn'] },
  { canonical: 'huggingface', aliases: ['huggingface', 'hugging face'] },
  { canonical: 'openai', aliases: ['openai', 'gpt-4', 'gpt-3'] },
  { canonical: 'anthropic', aliases: ['anthropic', 'claude'] },
  { canonical: 'vector database', aliases: ['vector database', 'vector db'] },
  { canonical: 'pinecone', aliases: ['pinecone'] },
  { canonical: 'postgresql', aliases: ['postgresql', 'postgres'] },
  { canonical: 'redis', aliases: ['redis'] },
  { canonical: 'aws', aliases: ['aws', 'amazon web services'] },
  { canonical: 'azure', aliases: ['azure', 'microsoft azure'] },
  { canonical: 'gcp', aliases: ['gcp', 'google cloud platform'] },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type AliasPattern = {
  canonical: string;
  alias: string;
};

function buildAliasPatterns(dictionary: TechnologyEntry[]): AliasPattern[] {
  return dictionary
    .flatMap((entry) =>
      entry.aliases.map((alias) => ({
        canonical: entry.canonical,
        alias,
      })),
    )
    .sort((a, b) => b.alias.length - a.alias.length);
}

function aliasPattern(alias: string): RegExp {
  if (alias.includes(' ')) {
    return new RegExp(escapeRegex(alias), 'i');
  }
  return new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
}

function findNonOverlappingMatches(
  text: string,
  patterns: AliasPattern[],
): Set<string> {
  const matchedCanonicals = new Set<string>();
  const matchedRanges: Array<{ start: number; end: number }> = [];

  for (const { canonical, alias } of patterns) {
    if (matchedCanonicals.has(canonical)) {
      continue;
    }

    const pattern = aliasPattern(alias);
    const match = pattern.exec(text);
    if (!match || match.index === undefined) {
      continue;
    }

    const start = match.index;
    const end = start + match[0].length;
    const overlaps = matchedRanges.some(
      (range) => start < range.end && end > range.start,
    );
    if (overlaps) {
      continue;
    }

    matchedCanonicals.add(canonical);
    matchedRanges.push({ start, end });
  }

  return matchedCanonicals;
}

export function matchTechnologiesInText(
  text: string,
  options: MatchTechnologiesOptions = {},
): string[] {
  const dictionary = options.dictionary ?? FINSERV_AI_TECHNOLOGY_DICTIONARY;
  const patterns = buildAliasPatterns(dictionary);
  const matched = findNonOverlappingMatches(text.toLowerCase(), patterns);
  return [...matched].sort((a, b) => a.localeCompare(b));
}
