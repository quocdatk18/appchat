import { Carousel, Button } from 'antd';
import { useState } from 'react';
import styles from './OnboardingSlider.module.scss';

const slides = [
  {
    title: 'Gửi tin nhắn siêu tốc',
    description: 'Trò chuyện với bạn bè mọi lúc, mọi nơi, hoàn toàn miễn phí.',
    image: './images/chat.jpg',
  },
  {
    title: 'Gọi video chất lượng cao',
    description: 'Kết nối với người thân qua video call sắc nét, ổn định.',
    image: './images/call.jpg',
  },
  {
    title: 'Bảo mật tuyệt đối',
    description: 'Tin nhắn và cuộc gọi được mã hóa, an toàn tuyệt đối.',
    image: './images/secure.jpg',
  },
];

export default function OnboardingSlider() {
  const [current, setCurrent] = useState(0);

  return (
    <div className={styles.onboardingContainer}>
      <Carousel afterChange={setCurrent} dots className={styles.carousel} effect="scrollx">
        {slides.map((slide, idx) => (
          <div className={styles.slide} key={idx}>
            <div className={styles.slideContent}>
              <img src={slide.image} alt={slide.title} className={styles.image} />
              <h2 className={styles.title}>{slide.title}</h2>
              <p className={styles.desc}>{slide.description}</p>
            </div>
          </div>
        ))}
      </Carousel>
      <div className={styles.actions}>
        <Button type="primary" size="large">
          Bắt đầu sử dụng
        </Button>
      </div>
    </div>
  );
}
