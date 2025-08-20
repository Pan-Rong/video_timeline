import { Link, Outlet } from 'umi';
import styles from './index.less';

export default function Layout() {
  return (
    <div className={styles.warpper}>
      <div className={styles.leftContent}>
        <ul>
              <li>
                  <Link to="/">首页</Link>
              </li>
              <li>
                  <Link to="/editor">视频编辑</Link>
              </li>
              <li>
                  <Link to="/audioDraw">音频及其波形绘制</Link>
              </li>
              <li>
                  <Link to="/videoAudio">下载视频中的音频文件</Link>
              </li>
              <li>
                  <Link to="/videoAudioDraw">视频及其音频合并后的波形绘制</Link>
              </li>
          </ul>
      </div>
      <div className={styles.rightContent}>
          <Outlet />
      </div>
    </div>
  );
}
