import { Carousel, Button } from 'antd';
import { useState } from 'react';
import styles from './OnboardingSlider.module.scss';

const slides = [
  {
    title: 'Gửi tin nhắn siêu tốc',
    description: 'Trò chuyện với bạn bè mọi lúc, mọi nơi, hoàn toàn miễn phí.',
    image:
      'https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/520506462_1120899223419858_2119225403879297116_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=101&ccb=1-7&_nc_sid=833d8c&_nc_ohc=KUGRQUXizokQ7kNvwHDUcwr&_nc_oc=AdmRvlswfdoBebGKrk89DWn8raVp_swUJjj7ZWn_uTPKap2jUViS9ECADti-z0x5nnBK3m9QN-8GR0BzO8iCQRie&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=NHp24GTMotB3wkwMB_fNWw&oh=00_AfT1r6xSsNIbk4hZx9W8SPdNwyqBX3XbqXiPqFtyqYvWrg&oe=688AE4F1',
  },
  {
    title: 'Gọi video chất lượng cao',
    description: 'Kết nối với người thân qua video call sắc nét, ổn định.',
    image:
      'https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/515492399_1109820201194427_7502156286569325047_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=833d8c&_nc_ohc=H74-k8LUGysQ7kNvwEw6hSA&_nc_oc=AdkzzGULCs43o9s7D62f1b6S8_EYCUKqElCI_xj8HLBBkgKHU3r-AiLnThdjM-ifdCx1AcU0NggMUWi7wpQdNHh&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=HMcCK4DuMaaa8yGLDruk5Q&oh=00_AfRBMPMfXGZSjU6hUnvMXA3YhyyRFputruA2IHthOnMWEw&oe=688AD79E',
  },
  {
    title: 'Bảo mật tuyệt đối',
    description: 'Tin nhắn và cuộc gọi được mã hóa, an toàn tuyệt đối.',
    image:
      'https://scontent.fdad3-6.fna.fbcdn.net/v/t39.30808-6/515489507_1106801118163002_7787415146073859926_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=833d8c&_nc_ohc=3axl8f1bCGYQ7kNvwEvHZLB&_nc_oc=AdlIVuJC8t-M4I0xpjmoXpa_NLOZGOFd4hgN-uJGg3M-Mh33L8trmLg_0RzDukOtaAYzhmpM_UOk-xaPamAsajqR&_nc_zt=23&_nc_ht=scontent.fdad3-6.fna&_nc_gid=XleeUYc_-QcGcg8kl_Rjiw&oh=00_AfROFv4RVCrNv1xOqzgR4A-CgvTg5JTtVOrr_P0sg5FlaA&oe=688AECF5',
  },
];

export default function OnboardingSlider() {
  const [current, setCurrent] = useState(0);

  return (
    <div className={styles.onboardingContainer}>
      <Carousel autoplay autoplaySpeed={3000} afterChange={setCurrent} dots effect="scrollx">
        {slides.map((slide, idx) => (
          <div
            className={styles.onboardingSlider}
            key={idx}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className={styles.overlay} />
            <div className={styles.onboardingContent}>
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
