import { storyTimeline } from '@/lib/story-progress';

/**
 * Holt den Story-Text von /api/generate-story als Stream und meldet die
 * geschriebenen Zeichen an den Loader (storyTimeline). Antwortet der Server
 * ohne Stream (JSON), funktioniert es genauso – nur ohne Zwischenstand.
 */
export async function generateStoryWithProgress(body: Record<string, unknown>): Promise<string> {
  storyTimeline.textStarted();

  const response = await fetch('/api/generate-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate story`);
  }

  let story = '';
  if (!response.body || !response.headers.get('content-type')?.includes('ndjson')) {
    const result = await response.json();
    story = typeof result.story === 'string' ? result.story : '';
  } else {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const handle = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.type === 'progress') storyTimeline.textProgress(event.chars);
      else if (event.type === 'story') story = event.story;
      else if (event.type === 'error') throw new Error(event.message || 'Failed to generate story');
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(handle);
    }
    handle(buffer + decoder.decode());
  }

  story = story.trim();
  if (!story) throw new Error('Empty story received from API');
  storyTimeline.textDone(story);
  return story;
}
