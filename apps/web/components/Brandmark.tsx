import { LogoMark } from './LogoMark';

export function Brandmark() {
  return (
    <span className="brandmark">
      <LogoMark size={34} />
      <span>
        Imob<span className="accent">Parcerias</span>
      </span>
    </span>
  );
}
