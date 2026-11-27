// Restore the dashboard's existing grant. Each commentary request has its own
// response and conversation, so a day of narration never grows a chat transcript.
import { BrowserAuthorization } from '@chronoai/nyx-assistant-sdk/agent-key';
import { createNyxChatService, nyxChatConnection } from '@chronoai/nyx-assistant-sdk/nyx-chat';

export async function guideWriter(widget, signal) {
  const flow = new BrowserAuthorization({
    base: widget.dataset.nyxid, verificationOrigin: widget.dataset.verificationOrigin,
    services: ['llm-nyx', 'chrono-llm-public', 'llm-openai'], keySource: 'new',
    acceptLegacyVoiceCatalog: true, credentialStorage: localStorage, clientLabel: location.hostname,
  });
  const grant = await flow.restore(signal);
  if (!grant || grant.access.managementUrl !== widget.access?.managementUrl) throw Error('NyxID');
  const service = nyxChatConnection(grant.identity);
  if (!service) throw Error('llm-nyx');
  return writeSegments(grant.connection, service, widget.dataset.instructions);
}

export function writeSegments(connection, service, instructions) {
  const instanceId = crypto.randomUUID();
  const tourInstructions = instructions + '\nYou are already narrating an automatic tour. The dashboard opens the target in your JSON reply. Use the supplied snapshot for this segment and return the target and spoken text together.';
  return async (context, signal) => {
    const reply = await createNyxChatService(connection, {service, instructions: tourInstructions}).turn({
      instanceId, requestId: crypto.randomUUID(), tools: [], context,
      input: {type: 'user', text: 'Choose one of the supplied stops for this segment. Return only JSON {"target":"its exact id","text":"two short natural sentences to speak in the page language"}. Name one concrete item and explain what a visitor can see or follow at that stop. Preserve its reported status and uncertainty. Use only the supplied facts for that stop. Avoid repeating the previous segment.'},
    }, signal, () => {});
    if (reply.type !== 'answer') throw Error('Missing narration');
    const segment = JSON.parse(reply.text.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/gi, ''));
    if (!context.stops.some(stop => stop.target === segment.target) ||
        typeof segment.text !== 'string' || !segment.text.trim() || segment.text.length > 1000) throw Error('Invalid narration');
    return {target: segment.target, text: segment.text.trim()};
  };
}
