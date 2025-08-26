import { useRef, useEffect, useState } from 'react';
import { useRootStore } from '../../models';
import { RULER_HEIGHT, TRACK_HEIGHT, TRACK_SPACING } from '../../models/constant';

import styles from './index.less';
import { ITrack, IClipItem } from '../../types';
import TracksCanvas from './TracksCanvas';
import CoverCanvas from './CoverCanvas';


const Tracks = (props: { videoId: string; }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { videoId } = props;
   
    return (
        <div
            ref={containerRef}
            id={'custom_tracks_container'}
            className={styles.tracksContainer}>
            <TracksCanvas videoId={videoId} />
            <CoverCanvas />
        </div>
    )
}

export default Tracks;
