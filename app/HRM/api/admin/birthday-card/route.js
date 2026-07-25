import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

export const runtime = 'nodejs';

const CARD_WIDTH = 900;
const CARD_HEIGHT = 1080;

async function requireHrAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!authContext?.isHrAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authContext };
}

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'E';
}

function sanitizeText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toRenderableImageUrl(origin, url) {
  const value = sanitizeText(url);
  if (!value) {
    return '';
  }

  try {
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin) {
      return `${origin}/api/image-proxy?url=${encodeURIComponent(parsed.toString())}`;
    }

    return parsed.toString();
  } catch {
    return '';
  }
}

function BirthdayAvatar({ employee, origin }) {
  const profilePictureUrl = toRenderableImageUrl(origin, employee?.profilePictureUrl);
  const name = sanitizeText(employee?.name, 'Employee');

  if (profilePictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePictureUrl}
        alt={name}
        width="220"
        height="220"
        style={{
          width: 220,
          height: 220,
          borderRadius: 9999,
          objectFit: 'cover',
          border: '10px solid rgba(255,255,255,0.92)',
          boxShadow: '0 24px 48px rgba(49,112,197,0.22)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 220,
        height: 220,
        borderRadius: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '10px solid rgba(255,255,255,0.92)',
        background: '#FFFFFF',
        color: '#3170c5',
        fontSize: 82,
        fontWeight: 800,
        boxShadow: '0 24px 48px rgba(49,112,197,0.22)',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

export async function POST(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const label = sanitizeText(body?.label, 'Upcoming Birthday');
    const heading = sanitizeText(body?.heading, 'Happy Birthday');
    const message = sanitizeText(body?.message, 'Wishing you a joyful celebration.');
    const dateLabel = sanitizeText(body?.dateLabel, '--');
    const employees = Array.isArray(body?.employees)
      ? body.employees
          .slice(0, 4)
          .map((employee) => ({
            id: sanitizeText(employee?.id),
            name: sanitizeText(employee?.name, 'Employee'),
            profilePictureUrl: sanitizeText(employee?.profilePictureUrl),
          }))
      : [];
    const moreCount = Math.max(0, Number(body?.moreCount || 0));
    const origin = request.nextUrl.origin;
    const avatarGap = employees.length <= 2 ? 28 : 24;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            padding: 18,
            background: '#FFFFFF',
            fontFamily: 'Georgia, Times New Roman, serif',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 56,
              border: '2px solid #afd0f4',
              background: '#edf4fc',
              padding: '54px 54px 50px',
              boxShadow: '0 34px 90px rgba(49,112,197,0.16)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -90,
                top: -90,
                width: 320,
                height: 320,
                borderRadius: 9999,
                background: 'rgba(126,176,236,0.62)',
                filter: 'blur(24px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: -44,
                width: 180,
                height: 180,
                borderRadius: 9999,
                background: 'rgba(175,208,244,0.42)',
                filter: 'blur(18px)',
                transform: 'translateX(-50%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: -48,
                bottom: 150,
                width: 200,
                height: 200,
                borderRadius: 9999,
                background: 'rgba(191,219,254,0.30)',
                filter: 'blur(24px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 44,
                top: 204,
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: 'rgba(49,112,197,0.56)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 64,
                top: 276,
                width: 24,
                height: 24,
                borderRadius: 9999,
                background: 'rgba(49,112,197,0.62)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 118,
                top: 344,
                width: 14,
                height: 14,
                borderRadius: 9999,
                background: 'rgba(236,72,153,0.68)',
              }}
            />

            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  color: '#B45309',
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: 8,
                  lineHeight: 1.15,
                  textTransform: 'uppercase',
                }}
              >
                <span>{label.split(' ')[0] || label}</span>
                <span>{label.split(' ').slice(1).join(' ') || ''}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  color: '#EA580C',
                  fontSize: 54,
                  fontWeight: 700,
                }}
              >
                ✦
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                marginTop: 70,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: avatarGap,
                  width: '100%',
                  flexWrap: 'wrap',
                }}
              >
                {employees.map((employee) => (
                  <BirthdayAvatar key={employee.id || employee.name} employee={employee} origin={origin} />
                ))}
              </div>

              {moreCount > 0 ? (
                <div
                  style={{
                    marginTop: 26,
                    display: 'flex',
                    color: '#C2410C',
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  +{moreCount} more on the same date
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 46,
                  maxWidth: 700,
                  display: 'flex',
                  color: '#4A2412',
                  fontSize: 62,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  textAlign: 'center',
                }}
              >
                {heading}
              </div>

              <div
                style={{
                  marginTop: 30,
                  maxWidth: 600,
                  display: 'flex',
                  color: '#7C5A49',
                  fontSize: 34,
                  lineHeight: 1.55,
                  textAlign: 'center',
                }}
              >
                {message}
              </div>

              <div
                style={{
                  marginTop: 54,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.88)',
                  boxShadow: '0 10px 28px rgba(49,112,197,0.12)',
                  padding: '18px 34px',
                  color: '#9A3412',
                  fontSize: 34,
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'flex', color: '#EA580C', fontSize: 30 }}>🎂</span>
                <span>{dateLabel}</span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Failed to generate birthday card.' }, { status: 500 });
  }
}
