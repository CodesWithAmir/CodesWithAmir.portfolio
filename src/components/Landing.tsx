import { PropsWithChildren } from "react";
import "./styles/Landing.css";

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <section className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Hello! I'm</h2>
            <h1>
              MUHAMMAD
              <br />
              <span>AMIR</span>
            </h1>
          </div>
          <div className="landing-info">
            <h3>A Passionate</h3>
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">Software Developer</div>
              <div className="landing-h2-2">Programmer</div>
            </h2>
            <h2>
              <div className="landing-h2-info">Programmer</div>
              <div className="landing-h2-info-1">Software Developer</div>
            </h2>
          </div>
        </div>
        {children}
      </section>
    </>
  );
};

export default Landing;
