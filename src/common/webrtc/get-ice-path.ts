import type { IcePath } from "./limit-ice-servers";

// The fields of the transport, candidate pair and local candidate stats
interface IceStats {
  id: string;
  type: string;
  selectedCandidatePairId?: string;
  selected?: boolean;
  localCandidateId?: string;
  candidateType?: string;
  relayProtocol?: string;
  url?: string;
}

/**
 * Reads the network path a connected peer connection uses. Returns
 * `undefined` if the browser doesn't report it.
 */
export const getIcePath = async (
  peerConnection: RTCPeerConnection
): Promise<IcePath | undefined> => {
  const stats: Record<string, IceStats> = {};
  try {
    (await peerConnection.getStats()).forEach((report: IceStats) => {
      stats[report.id] = report;
    });
  } catch (_err: unknown) {
    return undefined;
  }
  const reports = Object.values(stats);
  const pairId = reports.find(
    (report) => report.type === "transport" && report.selectedCandidatePairId
  )?.selectedCandidatePairId;
  const pair = pairId
    ? stats[pairId]
    : // Firefox has no transport stats
      reports.find(
        (report) => report.type === "candidate-pair" && report.selected
      );
  const candidate = pair?.localCandidateId
    ? stats[pair.localCandidateId]
    : undefined;
  if (!candidate?.candidateType) {
    return undefined;
  }
  if (candidate.url?.startsWith("turn")) {
    return { relayUrl: candidate.url };
  }
  if (candidate.candidateType === "relay" || candidate.relayProtocol) {
    // Not all browsers report which TURN URL a relayed candidate came from
    return undefined;
  }
  return {};
};
