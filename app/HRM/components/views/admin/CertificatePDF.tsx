import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font, Svg, Circle, Path } from '@react-pdf/renderer';

// EASILY ADJUSTABLE CERTIFICATE DESIGN CONFIGURATION
// You can edit any value in this object to shift, resize, or reposition any text/element
export const CERTIFICATE_CONFIG = {
  // Left Column (Blue strip) Spacing and sizing
  leftColumn: {
    width: '20%',               // Width of left column (e.g. '20%')
    backgroundColor: '#0C2D58',   // Deep blue background
    paddingTop: 0,
    paddingBottom: 25,
    paddingLeft: 10,
    paddingRight: 10,

    // Top Seal Badge (Wreath / Seal)
    seal: {
      width: '100%',            // Image width
      height: 'auto',           // Image height
      marginTop: 0,             // Margin top from edge
      marginBottom: 0,          // Margin bottom
      marginLeft: 0,
      marginRight: 0,
      scale: 1.16,              // Image scale zoom factor
    },

    // QR Code
    qrCode: {
      width: 125,               // Width of transparent QR Code (2x size)
      height: 125,              // Height of transparent QR Code (2x size)
      marginTop: 10,            // Margin top above QR code
      marginBottom: 10,         // Margin bottom below QR code
      marginLeft: 0,
      marginRight: 0,
    },
    // Unique ID Text
    idText: {
      fontSize: 8.5,            // Unique ID font size
      color: '#FFFFFF',         // Color
      marginTop: 0,             // Margin top
      marginBottom: 10,         // Spacing below the ID text
    }
  },

  // Right Column (Details area) Spacing and sizing
  rightColumn: {
    width: '80%',               // Width of right column (e.g. '80%')
    backgroundColor: '#FDFDFD',   // Background fallback color
    paddingTop: 5,              // Reduced top padding inside details area
    paddingBottom: 5,           // Reduced bottom padding inside details area
    paddingLeft: 25,            // Left padding
    paddingRight: 25,           // Right padding

    // Background Image Shift & Zoom configuration
    background: {
      src: '/assets/bg.jpeg',
      top: -30,                 // Shift top (zoomed in to hide corner designs)
      right: -60,               // Shift right (increased to shift image rightwards)
      bottom: -30,              // Shift bottom
      left: 1,                  // Shift left (reduced to pull image rightwards)
      width: '125%',            // Width to zoom
      height: '125%',           // Height to zoom
      objectFit: 'cover' as 'cover' | 'contain' | 'fill',
    },

    // Date Section (Georgia Bold)
    issueDate: {
      fontSize: 11.5,
      color: '#1F2937',
      marginTop: 0,
      marginRight: -10,
      marginBottom: 2,
    },

    // Top Logo (BnC logo)
    logo: {
      width: 260,               // Center logo width
      height: 190,              // Center logo height
      marginTop: -210,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    },

    // Main Title (Old English Text MT)
    title: {
      text: 'Cerificate',       // Text value matching the target image
      fontSize: 60,
      color: '#0C2D58',
      marginTop: -90,
      marginBottom: 0,
      letterSpacing: 6,         // Wider spacing at the top
    },

    // Subtitle (Poppins Regular)
    subtitle: {
      text: 'OF INTERNSHIP',       // Updated to OF INTERNSHIP
      fontSize: 14,               // Increased font size
      color: '#4B5563',
      letterSpacing: 10,          // Widened spacing
      marginTop: 0,
      marginBottom: 6,
    },

    // Award Text ("This training certificate is proudly awarded to")
    awardDeclaration: {
      text: 'This training certificate is proudly awarded to',
      fontSize: 16,             // Increased from 14.5
      color: '#4B5563',
      marginTop: 0,
      marginBottom: 5,
      letterSpacing: 1,         // Added letter spacing to make it wider
    },

    // Recipient Name (Edwardian Script ITC)
    recipientName: {
      fontSize: 26,             // Reduced size as requested
      color: '#D32F2F',         // Red color for calligraphy
      marginTop: 2,
      marginBottom: 2,
    },

    // Divider Line
    divider: {
      width: 280,
      height: 8,
      marginTop: 0,
      marginBottom: 8,
      hasDot: false,            // Removed the dot below the Recipient Name line
    },

    // Description text / course details
    description: {
      fontSize: 14.5,           // Increased from 12.5
      lineHeight: 1.6,
      marginTop: 0,
      marginBottom: 10,
      letterSpacing: 0.8,       // Added letter spacing to make it wider

      // Course Designation Name Styling (December Calligraphy cursive)
      courseFont: 'DecemberCalligraphy',
      courseFontSize: 24,       // Size for the cursive Course Name
      courseColor: '#0C2D58',   // Blue color for designation script
    },

    // Signatures Section (Now using elegant text e-signatures)
    signatures: {
      paddingHorizontal: 25,
      marginTop: 0,
      marginBottom: 8,
      columnWidth: 160,

      // CEO Signature
      ceoSignText: 'Anshu Prasad',
      ceoTextSize: 22,
      ceoColor: '#1E293B',
      ceoHeight: 32,
      ceoLabel: 'CEO of BnC',

      // HR Signature
      hrSignText: 'Rashmita Sen',
      hrTextSize: 22,
      hrColor: '#1E293B',
      hrHeight: 32,
      hrLabel: 'HR of BnC',

      lineHeight: 1.2,
      lineColor: '#0C2D58',
      labelSize: 10,
      labelColor: '#4B5563',
      showLine: true,          // Underline below signature restored
    },

    // Footer Layout (Badges + Contact Row)
    footer: {
      marginTop: 0,
      marginBottom: 0,
      borderTopWidth: 0,       // Removed horizontal line at the footer
      borderTopColor: '#E5E7EB',
      paddingTop: 0,

      // Left Favicon icon
      faviconWidth: 100,        // Increased size slightly
      faviconHeight: 100,       // Increased size slightly

      // Bottom Center Logo
      centerLogoWidth: 260,
      centerLogoHeight: 190,    // Set height to 190 to match top logo size
      centerLogoMarginTop: -65, // Crop top empty space
      centerLogoMarginBottom: -115, // Crop bottom empty space to decrease space below logo

      // Bottom Mail Text
      mailTextSize: 8,          // Slightly reduced for neat proportions
      mailTextColor: '#4B5563',
      mailTextMarginBottom: 3,

      // Contact Row Details
      contactTextSize: 10,      // Reduced to decrease wideness/size
      contactTextColor: '#4B5563',
      contactGap: 12,           // Reduced gap to decrease wideness
      contactItemGap: 8,        // Reduced item gap
      contactIconSize: 11,      // Reduced icon size

      // Right Wax Seal badge
      waxSealWidth: 100,        // Increased size 2X (from 50)
      waxSealHeight: 100,       // Increased size 2X (from 50)
    }
  }
};

// Register Google Fonts and specific TTF/OTF alternatives using local assets and JSDelivr CORS-friendly urls
Font.register({
  family: 'TaylorGothic',
  src: '/assets/TaylorGothic.ttf',
});

Font.register({
  family: '001SansSerifDemo',
  src: '/assets/001SansSerifDemo.otf',
});

Font.register({
  family: 'DecemberCalligraphy',
  src: '/assets/DecemberCalligraphy.ttf',
});

Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
});

Font.register({
  family: 'InterBold',
  src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf',
});

Font.register({
  family: 'Caveat',
  src: 'https://fonts.gstatic.com/s/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjfJ9SII.ttf',
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 0,
    width: '100%',
    height: '100%',
  },
  leftColumn: {
    width: CERTIFICATE_CONFIG.leftColumn.width,
    backgroundColor: CERTIFICATE_CONFIG.leftColumn.backgroundColor,
    color: '#FFFFFF',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: CERTIFICATE_CONFIG.leftColumn.paddingTop,
    paddingBottom: CERTIFICATE_CONFIG.leftColumn.paddingBottom,
    paddingLeft: CERTIFICATE_CONFIG.leftColumn.paddingLeft,
    paddingRight: CERTIFICATE_CONFIG.leftColumn.paddingRight,
  },
  rightColumn: {
    width: CERTIFICATE_CONFIG.rightColumn.width,
    height: '100%',
    backgroundColor: CERTIFICATE_CONFIG.rightColumn.backgroundColor,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: CERTIFICATE_CONFIG.rightColumn.background.top,
    left: CERTIFICATE_CONFIG.rightColumn.background.left,
    right: CERTIFICATE_CONFIG.rightColumn.background.right,
    bottom: CERTIFICATE_CONFIG.rightColumn.background.bottom,
    width: CERTIFICATE_CONFIG.rightColumn.background.width,
    height: CERTIFICATE_CONFIG.rightColumn.background.height,
    objectFit: CERTIFICATE_CONFIG.rightColumn.background.objectFit,
  },
  rightContentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: CERTIFICATE_CONFIG.rightColumn.paddingTop,
    paddingBottom: CERTIFICATE_CONFIG.rightColumn.paddingBottom,
    paddingLeft: CERTIFICATE_CONFIG.rightColumn.paddingLeft,
    paddingRight: CERTIFICATE_CONFIG.rightColumn.paddingRight,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  // Left Column Styles
  leftTop: {
    alignItems: 'center',
    width: '100%',
  },
  sealImage: {
    width: CERTIFICATE_CONFIG.leftColumn.seal.width,
    height: CERTIFICATE_CONFIG.leftColumn.seal.height as any,
    marginTop: CERTIFICATE_CONFIG.leftColumn.seal.marginTop,
    marginBottom: CERTIFICATE_CONFIG.leftColumn.seal.marginBottom,
    marginLeft: CERTIFICATE_CONFIG.leftColumn.seal.marginLeft,
    marginRight: CERTIFICATE_CONFIG.leftColumn.seal.marginRight,
  },
  leftBottom: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  certIdText: {
    fontFamily: 'InterBold',
    fontSize: CERTIFICATE_CONFIG.leftColumn.idText.fontSize,
    color: CERTIFICATE_CONFIG.leftColumn.idText.color,
    marginTop: CERTIFICATE_CONFIG.leftColumn.idText.marginTop,
    marginBottom: CERTIFICATE_CONFIG.leftColumn.idText.marginBottom,
    textAlign: 'center',
  },
  qrCodeBox: {
    width: CERTIFICATE_CONFIG.leftColumn.qrCode.width,
    height: CERTIFICATE_CONFIG.leftColumn.qrCode.height,
    marginTop: CERTIFICATE_CONFIG.leftColumn.qrCode.marginTop,
    marginBottom: CERTIFICATE_CONFIG.leftColumn.qrCode.marginBottom,
    marginLeft: CERTIFICATE_CONFIG.leftColumn.qrCode.marginLeft,
    marginRight: CERTIFICATE_CONFIG.leftColumn.qrCode.marginRight,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },

  // Right Column Styles
  issueDateText: {
    fontFamily: 'InterBold',
    fontSize: CERTIFICATE_CONFIG.rightColumn.issueDate.fontSize,
    color: CERTIFICATE_CONFIG.rightColumn.issueDate.color,
    textAlign: 'right',
    marginTop: CERTIFICATE_CONFIG.rightColumn.issueDate.marginTop,
    marginRight: CERTIFICATE_CONFIG.rightColumn.issueDate.marginRight,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.issueDate.marginBottom,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: CERTIFICATE_CONFIG.rightColumn.logo.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.logo.marginBottom,
    marginLeft: CERTIFICATE_CONFIG.rightColumn.logo.marginLeft,
    marginRight: CERTIFICATE_CONFIG.rightColumn.logo.marginRight,
  },
  logoImage: {
    width: CERTIFICATE_CONFIG.rightColumn.logo.width,
    height: CERTIFICATE_CONFIG.rightColumn.logo.height,
    objectFit: 'contain',
  },

  // Main headings
  mainHeader: {
    fontFamily: 'TaylorGothic',
    fontSize: CERTIFICATE_CONFIG.rightColumn.title.fontSize,
    color: CERTIFICATE_CONFIG.rightColumn.title.color,
    letterSpacing: CERTIFICATE_CONFIG.rightColumn.title.letterSpacing,
    textAlign: 'center',
    marginTop: CERTIFICATE_CONFIG.rightColumn.title.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.title.marginBottom,
  },
  subHeader: {
    fontFamily: '001SansSerifDemo',
    fontSize: CERTIFICATE_CONFIG.rightColumn.subtitle.fontSize,
    color: CERTIFICATE_CONFIG.rightColumn.subtitle.color,
    textAlign: 'center',
    letterSpacing: CERTIFICATE_CONFIG.rightColumn.subtitle.letterSpacing,
    textTransform: 'uppercase',
    marginTop: CERTIFICATE_CONFIG.rightColumn.subtitle.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.subtitle.marginBottom,
  },

  // Body text
  awardDeclaration: {
    fontFamily: 'Inter',
    fontSize: CERTIFICATE_CONFIG.rightColumn.awardDeclaration.fontSize,
    color: CERTIFICATE_CONFIG.rightColumn.awardDeclaration.color,
    textAlign: 'center',
    marginTop: CERTIFICATE_CONFIG.rightColumn.awardDeclaration.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.awardDeclaration.marginBottom,
  },
  recipientName: {
    fontFamily: 'DecemberCalligraphy',
    fontSize: CERTIFICATE_CONFIG.rightColumn.recipientName.fontSize,
    color: CERTIFICATE_CONFIG.rightColumn.recipientName.color,
    textAlign: 'center',
    marginTop: CERTIFICATE_CONFIG.rightColumn.recipientName.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.recipientName.marginBottom,
  },
  dividerLine: {
    width: CERTIFICATE_CONFIG.rightColumn.divider.width,
    alignSelf: 'center',
    height: CERTIFICATE_CONFIG.rightColumn.divider.height,
    marginTop: CERTIFICATE_CONFIG.rightColumn.divider.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.divider.marginBottom,
  },
  descriptionText: {
    fontFamily: 'Inter',
    fontSize: CERTIFICATE_CONFIG.rightColumn.description.fontSize,
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: CERTIFICATE_CONFIG.rightColumn.description.lineHeight,
    marginTop: CERTIFICATE_CONFIG.rightColumn.description.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.description.marginBottom,
  },
  courseField: {
    fontFamily: CERTIFICATE_CONFIG.rightColumn.description.courseFont as any,
    fontSize: CERTIFICATE_CONFIG.rightColumn.description.courseFontSize,
    color: CERTIFICATE_CONFIG.rightColumn.description.courseColor,
  },
  underlineField: {
    fontFamily: 'InterBold',
    textDecoration: 'underline',
  },

  // Signatures Section
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: CERTIFICATE_CONFIG.rightColumn.signatures.paddingHorizontal,
    marginTop: CERTIFICATE_CONFIG.rightColumn.signatures.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.signatures.marginBottom,
  },
  signatureCol: {
    alignItems: 'center',
    width: CERTIFICATE_CONFIG.rightColumn.signatures.columnWidth,
  },
  signatureText: {
    fontFamily: 'Caveat',
    fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.ceoTextSize,
    color: CERTIFICATE_CONFIG.rightColumn.signatures.ceoColor,
    height: CERTIFICATE_CONFIG.rightColumn.signatures.ceoHeight,
    marginBottom: 2,
    textAlign: 'center',
  },
  sigLine: {
    width: '100%',
    height: CERTIFICATE_CONFIG.rightColumn.signatures.lineHeight,
    backgroundColor: CERTIFICATE_CONFIG.rightColumn.signatures.lineColor,
    marginBottom: 4,
  },
  sigTitle: {
    fontFamily: 'InterBold',
    fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.labelSize,
    color: CERTIFICATE_CONFIG.rightColumn.signatures.labelColor,
  },

  // Footer Row
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderTop: `${CERTIFICATE_CONFIG.rightColumn.footer.borderTopWidth}px solid ${CERTIFICATE_CONFIG.rightColumn.footer.borderTopColor}`,
    paddingTop: CERTIFICATE_CONFIG.rightColumn.footer.paddingTop,
    marginTop: CERTIFICATE_CONFIG.rightColumn.footer.marginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.footer.marginBottom,
  },
  footerBadgeLeft: {
    width: CERTIFICATE_CONFIG.rightColumn.footer.waxSealWidth,
    height: CERTIFICATE_CONFIG.rightColumn.footer.waxSealHeight,
    objectFit: 'contain',
  },
  footerBadgeRight: {
    width: CERTIFICATE_CONFIG.rightColumn.footer.faviconWidth,
    height: CERTIFICATE_CONFIG.rightColumn.footer.faviconHeight,
    objectFit: 'contain',
  },
  footerCenterInfo: {
    alignItems: 'center',
    flexDirection: 'column',
    position: 'relative',
    top: -45,
  },
  footerLogo: {
    width: CERTIFICATE_CONFIG.rightColumn.footer.centerLogoWidth,
    height: CERTIFICATE_CONFIG.rightColumn.footer.centerLogoHeight,
    objectFit: 'contain',
    marginTop: CERTIFICATE_CONFIG.rightColumn.footer.centerLogoMarginTop,
    marginBottom: CERTIFICATE_CONFIG.rightColumn.footer.centerLogoMarginBottom,
  },
  footerContactText: {
    fontFamily: 'Inter',
    fontSize: CERTIFICATE_CONFIG.rightColumn.footer.mailTextSize,
    color: CERTIFICATE_CONFIG.rightColumn.footer.mailTextColor,
    textAlign: 'center',
    marginBottom: CERTIFICATE_CONFIG.rightColumn.footer.mailTextMarginBottom,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: CERTIFICATE_CONFIG.rightColumn.footer.contactGap,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CERTIFICATE_CONFIG.rightColumn.footer.contactItemGap,
  },
  contactText: {
    fontFamily: 'InterBold',
    fontSize: CERTIFICATE_CONFIG.rightColumn.footer.contactTextSize,
    color: CERTIFICATE_CONFIG.rightColumn.footer.contactTextColor,
  },
});

interface CertificatePDFProps {
  recipientName: string;
  recipientEmployeeId: string;
  designation: string;
  startDate: string;
  endDate: string;
  certificateId: string;
  issuedAt: string;
  qrCodeDataUrl: string;
}

export default function CertificatePDF({
  recipientName,
  recipientEmployeeId,
  designation,
  startDate,
  endDate,
  certificateId,
  issuedAt,
  qrCodeDataUrl,
}: CertificatePDFProps) {
  // Format dates: YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dateOnly = dateStr.slice(0, 10);
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);
  const formattedIssued = formatDate(issuedAt || new Date().toISOString().split('T')[0]);

  // Strip brackets from designation if present
  const cleanDesignation = designation ? designation.replace(/[\[\]]/g, '') : '';

  return (
    <Document title={`Certificate-${recipientName}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>

        {/* Left Column */}
        <View style={styles.leftColumn}>
          {/* Top Seal Badge */}
          <View style={styles.leftTop}>
            <Image
              src="/assets/—Pngtree—seal gold certificate_7931463.png"
              style={[
                styles.sealImage,
                { transform: `scale(${CERTIFICATE_CONFIG.leftColumn.seal.scale})` }
              ]}
            />
          </View>

          {/* Bottom QR Code and ID */}
          <View style={styles.leftBottom}>
            <Text style={styles.certIdText}>ID: {certificateId}</Text>
            <View style={styles.qrCodeBox}>
              {qrCodeDataUrl ? (
                <Image src={qrCodeDataUrl} style={styles.qrImage} />
              ) : (
                <View style={{ backgroundColor: 'transparent', width: '100%', height: '100%' }} />
              )}
            </View>
          </View>
        </View>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          {/* Background Image */}
          <Image src="/assets/bg.jpeg" style={styles.backgroundImage} />

          <View style={styles.rightContentContainer}>
            {/* Top Issue Date */}
            <View style={{ width: '100%' }}>
              <Text style={styles.issueDateText}>Issue Date: {formattedIssued}</Text>
            </View>

            {/* Top Center Logo */}
            <View style={styles.logoContainer}>
              <Image src="/assets/bnc consultech high.png" style={styles.logoImage} />
            </View>

            {/* Header */}
            <View>
              <Text style={styles.mainHeader}>{CERTIFICATE_CONFIG.rightColumn.title.text}</Text>
              <Text style={styles.subHeader}>{CERTIFICATE_CONFIG.rightColumn.subtitle.text}</Text>
            </View>

            {/* Award Text */}
            <View>
              <Text style={styles.awardDeclaration}>{CERTIFICATE_CONFIG.rightColumn.awardDeclaration.text}</Text>
              <Text style={styles.recipientName}>{recipientName}</Text>

              {/* Elegant Divider Line with one black dot touching the line on both sides */}
              <View style={styles.dividerLine}>
                <Svg viewBox="0 0 200 6" width="100%" height="100%">
                  <Path d="M10 3 L190 3" stroke="#0C2D58" strokeWidth="0.8" />
                  <Circle cx="10" cy="3" r="1.5" fill="#0C2D58" />
                  <Circle cx="190" cy="3" r="1.5" fill="#0C2D58" />
                </Svg>
              </View>

              {/* Description Details paragraph (underlined and stylized) */}
              <Text style={styles.descriptionText}>
                has successfully completed <Text style={styles.courseField}>{cleanDesignation}</Text> internship program, offered by{'\n'}
                BnC Consultech from <Text style={styles.underlineField}>{formattedStart}</Text> to <Text style={styles.underlineField}>{formattedEnd}</Text>
              </Text>
            </View>

            {/* Signatures */}
            <View style={styles.signaturesRow}>
              {/* CEO Signature */}
              <View style={styles.signatureCol}>
                <Text style={[styles.signatureText, { fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.ceoTextSize, color: CERTIFICATE_CONFIG.rightColumn.signatures.ceoColor, height: CERTIFICATE_CONFIG.rightColumn.signatures.ceoHeight }]}>
                  {CERTIFICATE_CONFIG.rightColumn.signatures.ceoSignText}
                </Text>
                {CERTIFICATE_CONFIG.rightColumn.signatures.showLine && (
                  <View style={{ width: '100%', height: 6, marginBottom: 4 }}>
                    <Svg viewBox="0 0 100 6" width="100%" height="100%">
                      <Path d="M4 3 L96 3" stroke={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} strokeWidth="0.8" />
                      <Circle cx="4" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                      <Circle cx="96" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                    </Svg>
                  </View>
                )}
                <Text style={styles.sigTitle}>{CERTIFICATE_CONFIG.rightColumn.signatures.ceoLabel}</Text>
              </View>

              {/* HR Signature */}
              <View style={styles.signatureCol}>
                <Text style={[styles.signatureText, { fontSize: CERTIFICATE_CONFIG.rightColumn.signatures.hrTextSize, color: CERTIFICATE_CONFIG.rightColumn.signatures.hrColor, height: CERTIFICATE_CONFIG.rightColumn.signatures.hrHeight }]}>
                  {CERTIFICATE_CONFIG.rightColumn.signatures.hrSignText}
                </Text>
                {CERTIFICATE_CONFIG.rightColumn.signatures.showLine && (
                  <View style={{ width: '100%', height: 6, marginBottom: 4 }}>
                    <Svg viewBox="0 0 100 6" width="100%" height="100%">
                      <Path d="M4 3 L96 3" stroke={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} strokeWidth="0.8" />
                      <Circle cx="4" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                      <Circle cx="96" cy="3" r="1.2" fill={CERTIFICATE_CONFIG.rightColumn.signatures.lineColor} />
                    </Svg>
                  </View>
                )}
                <Text style={styles.sigTitle}>{CERTIFICATE_CONFIG.rightColumn.signatures.hrLabel}</Text>
              </View>
            </View>

            {/* Footer (badges + contact info) */}
            <View style={styles.footerRow}>
              {/* Left Badge: Gold Wax Seal */}
              <Image src="/assets/—Pngtree—gold wax seal icon for_20921944.png" style={styles.footerBadgeLeft} />

              {/* Center Info: same logo + contact details with blue icons */}
              <View style={styles.footerCenterInfo}>
                <Image src="/assets/bnc consultech high.png" style={styles.footerLogo} />
                <Text style={styles.footerContactText}>
                  For More Information Mail Us:{' '}
                  <Text style={{ color: '#FF5722', fontFamily: 'InterBold' }}>support@bncglobal.in</Text>
                </Text>

                <View style={styles.contactRow}>
                  {/* Phone Item */}
                  <View style={styles.contactItem}>
                    <Svg viewBox="0 0 24 24" width={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize} height={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize}>
                      <Path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.12.37 2.33.57 3.57.57a1 1 0 01-1 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.28 1.11l-2.17 2.2z" fill="#0C2D58" />
                    </Svg>
                    <Text style={styles.contactText}>+91-9810575613</Text>
                  </View>

                  {/* Web Item */}
                  <View style={styles.contactItem}>
                    <Svg viewBox="0 0 24 24" width={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize} height={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize}>
                      <Circle cx="12" cy="12" r="10" fill="none" stroke="#0C2D58" strokeWidth="1.5" />
                      <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" fill="none" stroke="#0C2D58" strokeWidth="1.2" />
                      <Path d="M2 12h20" stroke="#0C2D58" strokeWidth="1.2" />
                    </Svg>
                    <Text style={styles.contactText}>www.bncglobal.in</Text>
                  </View>

                  {/* Location Item */}
                  <View style={styles.contactItem}>
                    <Svg viewBox="0 0 24 24" width={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize} height={CERTIFICATE_CONFIG.rightColumn.footer.contactIconSize}>
                      <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="#0C2D58" />
                    </Svg>
                    <Text style={styles.contactText}>Gurugram and Saudi Arabia</Text>
                  </View>
                </View>
              </View>

              {/* Right Badge: Company Favicon */}
              <Image src="/assets/bnc consultech icon high.png" style={styles.footerBadgeRight} />
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}


