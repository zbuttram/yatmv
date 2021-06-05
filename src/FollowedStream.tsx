import { FollowedStreamData } from "./useTwitchData";

export default function FollowedStream({
  followed: { stream, user },
  className,
}: {
  followed: FollowedStreamData;
  className?: string;
}) {
  return <div className={className}>{stream.userName}</div>;
}
