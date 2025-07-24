export default function formatUpdatedAt(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    // Trả về giờ:phút
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffHours < 48) {
    return 'Hôm qua';
  } else {
    // Trả về ngày/tháng (VD: 21/07)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
}
