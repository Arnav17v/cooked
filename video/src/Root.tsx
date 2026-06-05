import "./index.css";
import { Composition } from "remotion";
import { MyComposition, VIDEO_DURATION_IN_FRAMES } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GetUncookedDemo"
        component={MyComposition}
        durationInFrames={VIDEO_DURATION_IN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
