import Image from 'next/image';

const logos = [
  {
    name: 'BNC Global',
    src: 'https://framerusercontent.com/images/1Llcmv1c2q6Gzc8PLAZn6FVsl24.png',
  },
  {
    name: 'BNC Global',
    src: 'https://framerusercontent.com/images/7Owr2A45BzBhY30q3tohNTbREQ.png',
  },
  {
    name: 'BNC Global',
    src: 'https://framerusercontent.com/images/zbuC3EcdzkBkQzP0jv0SB4Vd8M.png',
  },
  {
    name: 'BNC Global',
    src: 'https://framerusercontent.com/images/1maVSrfk3qzoDoF7isozxI1xeM.png',
  },
  {
    name: 'BNC Global',
    src: 'https://framerusercontent.com/images/xfqs7XNXtRUCfSofBqeA4zicBgA.png',
  },
  {
    name: 'BNC Global',
    src: 'https://framerusercontent.com/images/mWEyhK9Yqsp5kUMBqmjcCRtsth8.png',
  },
  {
    name: 'BNC Global',
    src: 'https://framerusercontent.com/images/73eHyPw5UZ7rZAFywlVd572sz4.png',
  },
];

export function LogoTicker() {
  return (
    <div className="w-full py-12 md:py-20 overflow-hidden bg-white">
      <div className="relative flex overflow-x-hidden group">
        <div className="animate-infinite-scroll flex gap-12 sm:gap-24 min-w-full items-center justify-around">
          {[...logos, ...logos].map((logo, idx) => (
            <div
              key={`${logo.name}-${idx}`}
              className="flex-shrink-0 w-32 md:w-40 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={160}
                height={48}
                sizes="160px"
                className="w-full h-auto object-contain"
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent"></div>
      </div>
    </div>
  );
}
