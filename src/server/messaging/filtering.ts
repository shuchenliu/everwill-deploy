// ============================================================================
// Whitelist filtering for inbound Slack events.
// Checks incoming events against allowed channels (and eventually users).
// If no whitelist is configured, all events pass through.
// ============================================================================

interface IncomingEvent {
  channel: string;
  // userId: string;
  // ts: string;
}

type FilterFn = (value: string) => boolean;

function getWhitelistFilter() {
  const allowedChannels =
    process.env.SLACK_CHANNEL_ALLOWED_LIST?.split(",").map((s) => s.trim()) ?? [];

  const filterOnChannel: FilterFn = (channel) => {
    if (allowedChannels.length === 0) return true;
    return allowedChannels.includes(channel);
  };

  // Add more filters here as needed (e.g., filterOnUser)
  const filters: Record<keyof IncomingEvent, FilterFn> = {
    channel: filterOnChannel,
  };

  // apply each filters
  const filtering = (event: IncomingEvent): boolean => {
    return (Object.keys(filters) as Array<keyof IncomingEvent>).every((key) => {
      return filters[key](event[key]);
    });
  };

  return { filtering };
}

export { getWhitelistFilter };
