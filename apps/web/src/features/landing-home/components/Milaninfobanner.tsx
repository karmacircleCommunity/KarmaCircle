import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";
import MilanBuild from "@assets/pictures/Banner/MilanBuild.svg";
import MilanCollaborate from "@assets/pictures/Banner/MilanCollaborate.svg";
import MilanConnect from "@assets/pictures/Banner/MilanConnect.svg";
import "./MilanInfoBanner.css";

/**
 * A second, finished marketing section — not mounted by `Home.tsx` or
 * anywhere else today. See SPEC.md, including the `target="blank"`
 * typo and the resize-reactivity gap (this component reads
 * `window.innerWidth` directly at render time rather than via a
 * `resize` listener, unlike `Landing.tsx`) — both kept as-is here.
 */
const Milaninfobanner = () => {
  useEffect(() => {
    AOS.init({
      once: false,
    });
    AOS.refresh();
  }, []);

  return (
    <div className="mib_mainparent  container">
      <div className="mib_collab_parent">
        <div
          className="mib_top_intro mib_collab_top"
          {...(window.innerWidth > 800
            ? { "data-aos": "fade-up", "data-aos-duration": "500" }
            : {})}
        >
          <h1>Collaborate.</h1>
        </div>

        <div className="mib_collab_bottom">
          <div
            className="mib_collab_bottom_middle"
            {...(window.innerWidth > 800
              ? { "data-aos": "fade-up", "data-aos-duration": "600" }
              : {})}
          >
            <h1>United, We Achieve Greatness.</h1>
            {window.innerWidth < 800 ? (
              <p>
                Collaborate with us as a charity, NGO, or individual to create
                an impact.
              </p>
            ) : (
              <p>
                Users can join as a charity, NGO, or individual to create a
                collaboration hub for connecting, collaborating, and raising
                funds.
              </p>
            )}
          </div>

          <div className="mib_sidewise container">
            <div className="mib_collab_bottom_left">
              <img src={MilanCollaborate} alt="" />
            </div>
            <div className="mib_collab_bottom_right">
              <h1>Join us, right away !</h1>

              {window.innerWidth < 800 ? (
                <p>
                  You can join us as a Charity, Non profit organisation, or an
                  Organization. Collaborate, and build a better tommorow.
                </p>
              ) : (
                <p>
                  You can join us as a Charity, Non profit organisation, or an
                  Organization. We are open to all. Collaborate, and build a better
                  tommorow.
                </p>
              )}

              <br />

              <h1>Events, Funds and more.</h1>
              {window.innerWidth < 800 ? (
                <p>
                  Collaborate with others to raise funds, promote charity
                  events, get sponsored and much more.
                </p>
              ) : (
                <p>
                  As a verified NGO, Organization or Charity, you can collaborate with
                  others to create events, raise funds, and promote charity
                  campaigns.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mib_collab_parent">
        <div
          className="mib_top_intro mib_collab_top"
          {...(window.innerWidth > 800
            ? { "data-aos": "fade-up", "data-aos-duration": "500" }
            : {})}
        >
          <h1>Connect.</h1>
        </div>

        <div className="mib_collab_bottom">
          <div
            className="mib_collab_bottom_middle"
            {...(window.innerWidth > 800
              ? { "data-aos": "fade-up", "data-aos-duration": "600" }
              : {})}
          >
            <h1>Linked, for a brighter tomorrow.</h1>

            {window.innerWidth < 800 ? (
              <p>
                Subscribe to your favorite NGOs, Charities, organizations and be a part
                of their impact.
              </p>
            ) : (
              <p>
                You can subscribe to your favourite NGOs, Charities, and organizations
                to get updates about their events, campaigns, and more.
              </p>
            )}
          </div>

          <div className="mib_sidewise container">
            <div className="mib_collab_bottom_left">
              <img src={MilanConnect} alt="" />
            </div>
            <div className="mib_collab_bottom_right">
              <h1>Donate, for a cause!</h1>
              {window.innerWidth < 800 ? (
                <p>
                  Support events, campaigns, and other organisations. We take 0
                  charges.
                </p>
              ) : (
                <p>
                  You can help people survive. You can support events,
                  campaigns, and other verified organisations. We take 0%
                  commission.
                </p>
              )}

              <br />

              <h1>Campaigns, to change world.</h1>
              {window.innerWidth < 800 ? (
                <p>
                  Be a part of the impact, subscribe to your favourite NGOs,
                  Charities and Organizations.
                </p>
              ) : (
                <p>
                  Connect with Veified NGOs, charities and other organizations to
                  participate in different campaigns related to environment,
                  education, and more.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mib_collab_parent">
        <div
          className="mib_top_intro mib_collab_top"
          {...(window.innerWidth > 800
            ? { "data-aos": "fade-up", "data-aos-duration": "500" }
            : {})}
        >
          <h1>Build.</h1>
        </div>

        <div className="mib_collab_bottom">
          <div
            className="mib_collab_bottom_middle"
            {...(window.innerWidth > 800
              ? { "data-aos": "fade-up", "data-aos-duration": "600" }
              : {})}
          >
            <h1>Crafting Tomorrow, Together.</h1>
            {window.innerWidth < 800 ? (
              <p>What&apos;s cooking ? A shop, Sponserships, Funds ! </p>
            ) : (
              <p>
                We are building a shop, to make another source of income for the
                NGOs, Charities, and organizations. We are also building a platform to
                connect people with verified professionals to build charities.
              </p>
            )}
          </div>

          <div className="mib_sidewise container">
            <div className="mib_collab_bottom_left">
              <img src={MilanBuild} alt="" />
            </div>
            <div className="mib_collab_bottom_right">
              <h1>Got something to sell ?</h1>
              {window.innerWidth < 800 ? (
                <p>
                  Verified organizations can put up their handmade products for
                  sale. We take 2% commission.
                </p>
              ) : (
                <p>
                  You, as a verified NGO, Charity, orphanage or indiviual can
                  put up your handmade products on our shop. We take 2%
                  commission on the sales.
                </p>
              )}

              <br />

              <h1>More coming soon.</h1>
              <p>
                We love to build things that will connect help and need. If you
                love what we do, you can support us by donating
                <a
                  href="https://github.com/sponsors/tamalCodes"
                  target="blank"
                  rel="noopener noreferrer"
                >
                  {" "}
                  here
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Milaninfobanner;
