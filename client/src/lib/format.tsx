import dayjs from 'dayjs';

interface Props {
  lastSeen: string | null; // ISO string hoặc Date
}

const LastSeenDisplay: React.FC<Props> = ({ lastSeen }) => {
  if (!lastSeen) return <span>Không rõ</span>;

  const now = dayjs();
  const seenTime = dayjs(lastSeen);
  const diffMinutes = now.diff(seenTime, 'minute');
  const diffHours = now.diff(seenTime, 'hour');

  let displayText = '';

  if (diffHours >= 24) {
    // Trên 24h → hiển thị ngày
    displayText = `Hoạt động lúc ${seenTime.format('HH:mm DD/MM/YYYY')}`;
  } else if (diffHours >= 1) {
    displayText = `Hoạt động ${diffHours} giờ trước`;
  } else {
    displayText = `Hoạt động ${diffMinutes} phút trước`;
  }

  return <span style={{ color: 'gray' }}>{displayText}</span>;
};

export default LastSeenDisplay;
