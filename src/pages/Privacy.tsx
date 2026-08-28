import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BLUE = "#2563eb";

const h2Style: React.CSSProperties = {
  color: BLUE,
  fontSize: 18,
  fontWeight: 700,
  marginTop: 32,
  marginBottom: 10,
};

const h3Style: React.CSSProperties = {
  color: BLUE,
  fontSize: 15,
  fontWeight: 700,
  marginTop: 20,
  marginBottom: 8,
};

const pStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.82)",
  fontSize: 14.5,
  lineHeight: 1.6,
  marginBottom: 14,
};

const ulStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.82)",
  fontSize: 14.5,
  lineHeight: 1.6,
  marginBottom: 14,
  paddingLeft: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const linkStyle: React.CSSProperties = { color: BLUE, textDecoration: "underline" };

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-6 pb-4 sticky top-0 z-10 bg-background border-b border-border">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6" style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
        <h1 style={{ color: "#ffffff", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28 }}>Last updated August 28, 2026</p>

        <p style={pStyle}>
          This Privacy Notice for Covo ("we", "us", or "our") describes how and why we might access, collect, store,
          use, and/or share ("process") your personal information when you use our services ("Services"), including
          when you:
        </p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            Visit our website at{" "}
            <a href="https://covo.host" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              https://covo.host
            </a>{" "}
            or any website of ours that links to this Privacy Notice
          </li>
          <li>Download and use our mobile application (Covo), or any other application of ours that links to this Privacy Notice</li>
          <li>
            Use Covo. Covo is a social platform for private events. Create personalised event pages, invite friends,
            manage RSVPs, share photos, chat, and keep track of everything in one place.
          </li>
          <li>Engage with us in other related ways, including any marketing or events</li>
        </ul>
        <p style={pStyle}>
          <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy
          rights and choices. We are responsible for making decisions about how your personal information is
          processed. If you do not agree with our policies and practices, please do not use our Services. If you
          still have any questions or concerns, please contact us at{" "}
          <a href="mailto:rufus.r.goldie@gmail.com" style={linkStyle}>rufus.r.goldie@gmail.com</a>.
        </p>

        <h2 style={h2Style}>SUMMARY OF KEY POINTS</h2>
        <p style={pStyle}>
          <em>
            This summary provides key points from our Privacy Notice, but you can find out more details about any of
            these topics by clicking the link following each key point or by using the table of contents below to
            find the section you are looking for.
          </em>
        </p>
        <p style={pStyle}>
          <strong>What personal information do we process?</strong> When you visit, use, or navigate our Services,
          we may process personal information depending on how you interact with us and the Services, the choices you
          make, and the products and features you use. Learn more about{" "}
          <a href="#personalinfo" style={linkStyle}>personal information you disclose to us</a>.
        </p>
        <p style={pStyle}>
          <strong>Do we process any sensitive personal information?</strong> Some of the information may be
          considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins,
          sexual orientation, and religious beliefs. We do not process sensitive personal information.
        </p>
        <p style={pStyle}>
          <strong>Do we collect any information from third parties?</strong> We do not collect any information from
          third parties.
        </p>
        <p style={pStyle}>
          <strong>How do we process your information?</strong> We process your information to provide, improve, and
          administer our Services, communicate with you, for security and fraud prevention, and to comply with law.
          We may also process your information for other purposes with your consent. We process your information
          only when we have a valid legal reason to do so. Learn more about{" "}
          <a href="#infouse" style={linkStyle}>how we process your information</a>.
        </p>
        <p style={pStyle}>
          <strong>In what situations and with which parties do we share personal information?</strong> We may share
          information in specific situations and with specific third parties. Learn more about{" "}
          <a href="#whoshare" style={linkStyle}>when and with whom we share your personal information</a>.
        </p>
        <p style={pStyle}>
          <strong>How do we keep your information safe?</strong> We have adequate organisational and technical
          processes and procedures in place to protect your personal information. However, no electronic
          transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we
          cannot promise or guarantee that hackers, cybercriminals, or other unauthorised third parties will not be
          able to defeat our security and improperly collect, access, steal, or modify your information. Learn more
          about <a href="#infosafe" style={linkStyle}>how we keep your information safe</a>.
        </p>
        <p style={pStyle}>
          <strong>What are your rights?</strong> Depending on where you are located geographically, the applicable
          privacy law may mean you have certain rights regarding your personal information. Learn more about{" "}
          <a href="#privacyrights" style={linkStyle}>your privacy rights</a>.
        </p>
        <p style={pStyle}>
          <strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by contacting
          us at <a href="mailto:rufus.r.goldie@gmail.com" style={linkStyle}>rufus.r.goldie@gmail.com</a>. We will
          consider and act upon any request in accordance with applicable data protection laws.
        </p>

        <h2 style={h2Style} id="toc">TABLE OF CONTENTS</h2>
        <ul style={{ ...ulStyle, listStyleType: "none", paddingLeft: 0 }}>
          <li><a href="#infocollect" style={linkStyle}>1. What information do we collect?</a></li>
          <li><a href="#infouse" style={linkStyle}>2. How do we process your information?</a></li>
          <li><a href="#legalbases" style={linkStyle}>3. What legal bases do we rely on to process your personal information?</a></li>
          <li><a href="#whoshare" style={linkStyle}>4. When and with whom do we share your personal information?</a></li>
          <li><a href="#cookies" style={linkStyle}>5. Do we use cookies and other tracking technologies?</a></li>
          <li><a href="#ai" style={linkStyle}>6. Do we offer artificial intelligence-based products?</a></li>
          <li><a href="#inforetain" style={linkStyle}>7. How long do we keep your information?</a></li>
          <li><a href="#infosafe" style={linkStyle}>8. How do we keep your information safe?</a></li>
          <li><a href="#privacyrights" style={linkStyle}>9. What are your privacy rights?</a></li>
          <li><a href="#DNT" style={linkStyle}>10. Controls for Do-Not-Track features</a></li>
          <li><a href="#policyupdates" style={linkStyle}>11. Do we make updates to this notice?</a></li>
          <li><a href="#contact" style={linkStyle}>12. How can you contact us about this notice?</a></li>
          <li><a href="#request" style={linkStyle}>13. How can you review, update, or delete the data we collect from you?</a></li>
        </ul>

        <h2 style={h2Style} id="infocollect">1. WHAT INFORMATION DO WE COLLECT?</h2>
        <h3 style={h3Style} id="personalinfo">Personal information you disclose to us</h3>
        <p style={pStyle}><em><strong>In Short:</strong> We collect personal information that you provide to us.</em></p>
        <p style={pStyle}>
          We collect personal information that you voluntarily provide to us when you register on the Services,
          express an interest in obtaining information about us or our products and Services, when you participate
          in activities on the Services, or otherwise when you contact us.
        </p>
        <p style={pStyle}>
          <strong>Personal Information Provided by You.</strong> The personal information that we collect depends on
          the context of your interactions with us and the Services, the choices you make, and the products and
          features you use. The personal information we collect may include the following:
        </p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>names</li>
          <li>email addresses</li>
          <li>phone numbers</li>
          <li>usernames</li>
          <li>passwords</li>
          <li>debit/credit card numbers</li>
          <li>billing addresses</li>
        </ul>
        <p style={pStyle}><strong>Sensitive Information.</strong> We do not process sensitive information.</p>
        <p style={pStyle}>
          <strong>Application Data.</strong> If you use our application(s), we also may collect the following
          information if you choose to provide us with access or permission:
        </p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            <em>Geolocation Information.</em> We may request access or permission to track location-based
            information from your mobile device, either continuously or while you are using our mobile
            application(s), to provide certain location-based services. If you wish to change our access or
            permissions, you may do so in your device's settings.
          </li>
          <li>
            <em>Mobile Device Access.</em> We may request access or permission to certain features from your mobile
            device, including your mobile device's camera, calendar, contacts, reminders, and other features. If you
            wish to change our access or permissions, you may do so in your device's settings.
          </li>
          <li>
            <em>Mobile Device Data.</em> We automatically collect device information (such as your mobile device ID,
            model, and manufacturer), operating system, version information and system configuration information,
            device and application identification numbers, browser type and version, hardware model, internet
            service provider and/or mobile carrier, and Internet Protocol (IP) address (or proxy server). If you are
            using our application(s), we may also collect information about the phone network associated with your
            mobile device, your mobile device's operating system or platform, the type of mobile device you use,
            your mobile device's unique device ID, and information about the features of our application(s) you
            accessed.
          </li>
        </ul>
        <p style={pStyle}>
          This information is primarily needed to maintain the security and operation of our application(s), for
          troubleshooting, and for our internal analytics and reporting purposes.
        </p>
        <p style={pStyle}>
          All personal information that you provide to us must be true, complete, and accurate, and you must notify
          us of any changes to such personal information.
        </p>

        <h3 style={h3Style}>Information automatically collected</h3>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> Some information — such as your Internet Protocol (IP) address and/or browser
            and device characteristics — is collected automatically when you visit our Services.
          </em>
        </p>
        <p style={pStyle}>
          We automatically collect certain information when you visit, use, or navigate the Services. This
          information does not reveal your specific identity (like your name or contact information) but may include
          device and usage information, such as your IP address, browser and device characteristics, operating
          system, language preferences, referring URLs, device name, country, location, information about how and
          when you use our Services, and other technical information. This information is primarily needed to
          maintain the security and operation of our Services, and for our internal analytics and reporting purposes.
        </p>
        <p style={pStyle}>
          Like many businesses, we also collect information through cookies and similar technologies. You can find
          out more about this in our Cookie Notice:{" "}
          <a href="https://covo.host/cookie-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            https://covo.host/cookie-policy
          </a>.
        </p>
        <p style={pStyle}>The information we collect includes:</p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            <em>Log and Usage Data.</em> Log and usage data is service-related, diagnostic, usage, and performance
            information our servers automatically collect when you access or use our Services and which we record in
            log files. Depending on how you interact with us, this log data may include your IP address, device
            information, browser type, and settings and information about your activity in the Services (such as the
            date/time stamps associated with your usage, pages and files viewed, searches, and other actions you
            take such as which features you use), device event information (such as system activity, error reports
            (sometimes called "crash dumps"), and hardware settings).
          </li>
          <li>
            <em>Device Data.</em> We collect device data such as information about your computer, phone, tablet, or
            other device you use to access the Services. Depending on the device used, this device data may include
            information such as your IP address (or proxy server), device and application identification numbers,
            location, browser type, hardware model, internet service provider and/or mobile carrier, operating
            system, and system configuration information.
          </li>
          <li>
            <em>Location Data.</em> We collect location data such as information about your device's location, which
            can be either precise or imprecise. How much information we collect depends on the type and settings of
            the device you use to access the Services. For example, we may use GPS and other technologies to collect
            geolocation data that tells us your current location (based on your IP address). You can opt out of
            allowing us to collect this information either by refusing access to the information or by disabling
            your Location setting on your device. However, if you choose to opt out, you may not be able to use
            certain aspects of the Services.
          </li>
        </ul>

        <h2 style={h2Style} id="infouse">2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> We process your information to provide, improve, and administer our Services,
            communicate with you, for security and fraud prevention, and to comply with law. We may also process
            your information for other purposes with your consent.
          </em>
        </p>
        <p style={pStyle}>
          <strong>We process your personal information for a variety of reasons, depending on how you interact with
          our Services, including:</strong>
        </p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            <strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong>{" "}
            We may process your information so you can create and log in to your account, as well as keep your
            account in working order.
          </li>
          <li>
            <strong>To deliver and facilitate delivery of services to the user.</strong> We may process your
            information to provide you with the requested service.
          </li>
          <li>
            <strong>To enable user-to-user communications.</strong> We may process your information if you choose to
            use any of our offerings that allow for communication with another user.
          </li>
          <li>
            <strong>To protect our Services.</strong> We may process your information as part of our efforts to keep
            our Services safe and secure, including fraud monitoring and prevention.
          </li>
          <li>
            <strong>To identify usage trends.</strong> We may process information about how you use our Services to
            better understand how they are being used so we can improve them.
          </li>
          <li>
            <strong>To save or protect an individual's vital interest.</strong> We may process your information when
            necessary to save or protect an individual's vital interest, such as to prevent harm.
          </li>
        </ul>

        <h2 style={h2Style} id="legalbases">3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR INFORMATION?</h2>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> We only process your personal information when we believe it is necessary and
            we have a valid legal reason (i.e. legal basis) to do so under applicable law, like with your consent, to
            comply with laws, to provide you with services to enter into or fulfil our contractual obligations, to
            protect your rights, or to fulfil our legitimate business interests.
          </em>
        </p>
        <p style={pStyle}>
          The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we
          rely on in order to process your personal information. As such, we may rely on the following legal bases
          to process your personal information:
        </p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            <strong>Consent.</strong> We may process your information if you have given us permission (i.e. consent)
            to use your personal information for a specific purpose. You can withdraw your consent at any time.
            Learn more about <a href="#withdrawconsent" style={linkStyle}>withdrawing your consent</a>.
          </li>
          <li>
            <strong>Performance of a Contract.</strong> We may process your personal information when we believe it
            is necessary to fulfil our contractual obligations to you, including providing our Services or at your
            request prior to entering into a contract with you.
          </li>
          <li>
            <strong>Legitimate Interests.</strong> We may process your information when we believe it is reasonably
            necessary to achieve our legitimate business interests and those interests do not outweigh your interests
            and fundamental rights and freedoms. For example, we may process your personal information for some of
            the purposes described in order to:
            <ul style={{ ...ulStyle, listStyleType: "circle", marginTop: 8, marginBottom: 0 }}>
              <li>Analyse how our Services are used so we can improve them to engage and retain users</li>
              <li>Diagnose problems and/or prevent fraudulent activities</li>
            </ul>
          </li>
          <li>
            <strong>Legal Obligations.</strong> We may process your information where we believe it is necessary for
            compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory
            agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in
            which we are involved.
          </li>
          <li>
            <strong>Vital Interests.</strong> We may process your information where we believe it is necessary to
            protect your vital interests or the vital interests of a third party, such as situations involving
            potential threats to the safety of any person.
          </li>
        </ul>

        <h2 style={h2Style} id="whoshare">4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> We may share information in specific situations described in this section
            and/or with the following third parties.
          </em>
        </p>
        <p style={pStyle}>We may need to share your personal information in the following situations:</p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            <strong>Business Transfers.</strong> We may share or transfer your information in connection with, or
            during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion
            of our business to another company.
          </li>
          <li>
            <strong>Offer Wall.</strong> Our application(s) may display a third-party hosted "offer wall". Such an
            offer wall allows third-party advertisers to offer virtual currency, gifts, or other items to users in
            return for the acceptance and completion of an advertisement offer. Such an offer wall may appear in our
            application(s) and be displayed to you based on certain data, such as your geographic area or
            demographic information. When you click on an offer wall, you will be brought to an external website
            belonging to other persons and will leave our application(s). A unique identifier, such as your user ID,
            will be shared with the offer wall provider in order to prevent fraud and properly credit your account
            with the relevant reward.
          </li>
        </ul>

        <h2 style={h2Style} id="cookies">5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
        <p style={pStyle}>
          <em><strong>In Short:</strong> We may use cookies and other tracking technologies to collect and store your information.</em>
        </p>
        <p style={pStyle}>
          We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information
          when you interact with our Services. Some online tracking technologies help us maintain the security of
          our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic
          site functions.
        </p>
        <p style={pStyle}>
          We also permit third parties and service providers to use online tracking technologies on our Services for
          analytics and advertising, including to help manage and display advertisements or to tailor advertisements
          to your interests. The third parties and service providers use their technology to provide advertising
          about products and services tailored to your interests which may appear either on our Services or on other
          websites.
        </p>
        <p style={pStyle}>
          Specific information about how we use such technologies and how you can refuse certain cookies is set out
          in our Cookie Notice:{" "}
          <a href="https://covo.host/cookie-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            https://covo.host/cookie-policy
          </a>.
        </p>

        <h2 style={h2Style} id="ai">6. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</h2>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> We offer products, features, or tools powered by artificial intelligence,
            machine learning, or similar technologies.
          </em>
        </p>
        <p style={pStyle}>
          As part of our Services, we offer products, features, or tools powered by artificial intelligence, machine
          learning, or similar technologies (collectively, "AI Products"). These tools are designed to enhance your
          experience and provide you with innovative solutions. The terms in this Privacy Notice govern your use of
          the AI Products within our Services.
        </p>
        <h3 style={h3Style}>Use of AI Technologies</h3>
        <p style={pStyle}>
          We provide the AI Products through third-party service providers ("AI Service Providers"), including
          Anthropic. As outlined in this Privacy Notice, your input, output, and personal information will be shared
          with and processed by these AI Service Providers to enable your use of our AI Products for purposes
          outlined in{" "}
          <a href="#legalbases" style={linkStyle}>"What legal bases do we rely on to process your personal information?"</a>{" "}
          above. You must not use the AI Products in any way that violates the terms or policies of any AI Service
          Provider.
        </p>
        <h3 style={h3Style}>Our AI Products</h3>
        <p style={pStyle}>Our AI Products are designed for the following functions:</p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>Image generation</li>
        </ul>
        <h3 style={h3Style}>How We Process Your Data Using AI</h3>
        <p style={pStyle}>
          All personal information processed using our AI Products is handled in line with our Privacy Notice and
          our agreement with third parties. This ensures high security and safeguards your personal information
          throughout the process, giving you peace of mind about your data's safety.
        </p>
        <h3 style={h3Style}>How to Opt Out</h3>
        <p style={pStyle}>We believe in giving you the power to decide how your data is used. To opt out, you can:</p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>Use a template or start blank instead of Build It if you don't want AI processing your description</li>
        </ul>

        <h2 style={h2Style} id="inforetain">7. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> We keep your information for as long as necessary to fulfil the purposes
            outlined in this Privacy Notice unless otherwise required by law.
          </em>
        </p>
        <p style={pStyle}>
          We will only keep your personal information for as long as it is necessary for the purposes set out in
          this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax,
          accounting, or other legal requirements). No purpose in this notice will require us keeping your personal
          information for longer than the period of time in which users have an account with us.
        </p>
        <p style={pStyle}>
          When we have no ongoing legitimate business need to process your personal information, we will either
          delete or anonymise such information, or, if this is not possible (for example, because your personal
          information has been stored in backup archives), then we will securely store your personal information and
          isolate it from any further processing until deletion is possible.
        </p>

        <h2 style={h2Style} id="infosafe">8. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> We aim to protect your personal information through a system of organisational
            and technical security measures.
          </em>
        </p>
        <p style={pStyle}>
          We have implemented appropriate and reasonable technical and organisational security measures designed to
          protect the security of any personal information we process. However, despite our safeguards and efforts
          to secure your information, no electronic transmission over the internet or information storage technology
          can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or
          other unauthorised third parties will not be able to defeat our security and improperly collect, access,
          steal, or modify your information. Although we will do our best to protect your personal information,
          transmission of personal information to and from our Services is at your own risk. You should only access
          the Services within a secure environment.
        </p>

        <h2 style={h2Style} id="privacyrights">9. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
        <p style={pStyle}>
          <em>
            <strong>In Short:</strong> In some regions, such as the European Economic Area (EEA), United Kingdom
            (UK), and Switzerland, you have rights that allow you greater access to and control over your personal
            information. You may review, change, or terminate your account at any time, depending on your country,
            province, or state of residence.
          </em>
        </p>
        <p style={pStyle}>
          In some regions (like the EEA, UK, and Switzerland), you have certain rights under applicable data
          protection laws. These may include the right (i) to request access and obtain a copy of your personal
          information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal
          information; (iv) if applicable, to data portability; and (v) not to be subject to automated
          decision-making. In certain circumstances, you may also have the right to object to the processing of your
          personal information. You can make such a request by contacting us using the contact details provided in{" "}
          <a href="#contact" style={linkStyle}>"How can you contact us about this notice?"</a> below.
        </p>
        <p style={pStyle}>We will consider and act upon any request in accordance with applicable data protection laws.</p>
        <p style={pStyle}>
          If you are located in the UK and are unhappy with how we have handled your personal information, you can
          make a complaint directly to us. This is in addition to the rights you have under the UK General Data
          Protection Regulation and the Data Protection Act 2018.
        </p>
        <p style={pStyle}>How to contact us:</p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            <strong>Online:</strong>{" "}
            <a href="https://covo.host/contact" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              https://covo.host/contact
            </a>
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:rufus.r.goldie@gmail.com" style={linkStyle}>rufus.r.goldie@gmail.com</a>
          </li>
          <li><strong>Post:</strong> see <a href="#contact" style={linkStyle}>"How can you contact us about this notice?"</a></li>
        </ul>
        <p style={pStyle}>What happens after you complain:</p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>We will acknowledge your complaint within 30 days of receiving it.</li>
          <li>We will investigate without unjustifiable or excessive delay.</li>
          <li>We will keep you informed of progress and explain the outcome.</li>
        </ul>
        <p style={pStyle}>
          If you are not happy with our final response, you can refer your complaint to the Information
          Commissioner's Office, the UK supervisory authority.
        </p>
        <ul style={{ ...ulStyle, listStyleType: "disc" }}>
          <li>
            <strong>Website:</strong>{" "}
            <a href="https://ico.org.uk/make-a-complaint" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              ico.org.uk/make-a-complaint
            </a>
          </li>
          <li><strong>Helpline:</strong> 0303 123 1113</li>
          <li><strong>Post:</strong> Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</li>
        </ul>
        <p style={pStyle}>
          If you are located in the EEA or UK and you believe we are unlawfully processing your personal information,
          you also have the right to complain to your{" "}
          <a href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Member State data protection authority
          </a>{" "}
          or{" "}
          <a href="https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            UK data protection authority
          </a>.
        </p>
        <p style={pStyle}>
          If you are located in Switzerland, you may contact the{" "}
          <a href="https://www.edoeb.admin.ch/edoeb/en/home.html" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Federal Data Protection and Information Commissioner
          </a>.
        </p>

        <h3 style={h3Style} id="withdrawconsent">Withdrawing your consent</h3>
        <p style={pStyle}>
          If we are relying on your consent to process your personal information, you have the right to withdraw
          your consent at any time. You can withdraw your consent at any time by contacting us using the contact
          details provided in <a href="#contact" style={linkStyle}>"How can you contact us about this notice?"</a>{" "}
          below.
        </p>
        <p style={pStyle}>
          However, please note that this will not affect the lawfulness of the processing before its withdrawal, nor
          will it affect the processing of your personal information conducted in reliance on lawful processing
          grounds other than consent.
        </p>

        <h3 style={h3Style}>Account Information</h3>
        <p style={pStyle}>
          If you would at any time like to review or change the information in your account or terminate your
          account, you can log in to your account settings and update your user account.
        </p>
        <p style={pStyle}>
          Upon your request to terminate your account, we will deactivate or delete your account and information
          from our active databases. However, we may retain some information in our files to prevent fraud,
          troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with
          applicable legal requirements.
        </p>
        <p style={pStyle}>
          <strong>Cookies and similar technologies:</strong> Most web browsers are set to accept cookies by default.
          If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you
          choose to remove cookies or reject cookies, this could affect certain features or services of our
          Services. For further information, please see our Cookie Notice:{" "}
          <a href="https://covo.host/cookie-policy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            https://covo.host/cookie-policy
          </a>.
        </p>
        <p style={pStyle}>
          If you have questions or comments about your privacy rights, you may email us at{" "}
          <a href="mailto:rufus.r.goldie@gmail.com" style={linkStyle}>rufus.r.goldie@gmail.com</a>.
        </p>

        <h2 style={h2Style} id="DNT">10. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
        <p style={pStyle}>
          Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT")
          feature or setting you can activate to signal your privacy preference not to have data about your online
          browsing activities monitored and collected. At this stage, no uniform technology standard for recognising
          and implementing DNT signals has been finalised. As such, we do not currently respond to DNT browser
          signals or any other mechanism that automatically communicates your choice not to be tracked online. If a
          standard for online tracking is adopted that we must follow in the future, we will inform you about that
          practice in a revised version of this Privacy Notice.
        </p>

        <h2 style={h2Style} id="policyupdates">11. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
        <p style={pStyle}>
          <em><strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.</em>
        </p>
        <p style={pStyle}>
          We may update this Privacy Notice from time to time. The updated version will be indicated by an updated
          "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we
          may notify you either by prominently posting a notice of such changes or by directly sending you a
          notification. We encourage you to review this Privacy Notice frequently to be informed of how we are
          protecting your information.
        </p>

        <h2 style={h2Style} id="contact">12. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
        <p style={pStyle}>
          If you have questions or comments about this notice, you may contact our Data Protection Officer (DPO) by
          email at <a href="mailto:rufus.r.goldie@gmail.com" style={linkStyle}>rufus.r.goldie@gmail.com</a>, by phone
          at 07823347965, or by post at:
        </p>
        <p style={{ ...pStyle, marginBottom: 0 }}>Covo</p>
        <p style={{ ...pStyle, marginBottom: 0 }}>Data Protection Officer</p>
        <p style={{ ...pStyle, marginBottom: 0 }}>Hall Farm, School Road, West Rudham</p>
        <p style={{ ...pStyle, marginBottom: 0 }}>Kings Lynn, England PE31 8TE</p>
        <p style={pStyle}>United Kingdom</p>

        <h2 style={h2Style} id="request">13. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
        <p style={{ ...pStyle, marginBottom: 40 }}>
          Based on the applicable laws of your country, you may have the right to request access to the personal
          information we collect from you, details about how we have processed it, correct inaccuracies, or delete
          your personal information. You may also have the right to withdraw your consent to our processing of your
          personal information. These rights may be limited in some circumstances by applicable law. To request to
          review, update, or delete your personal information, please contact us at{" "}
          <a href="mailto:rufus.r.goldie@gmail.com" style={linkStyle}>rufus.r.goldie@gmail.com</a>.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
