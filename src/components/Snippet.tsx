import { CopyButton } from "./CopyButton";

export function Snippet({ text }: { text: string }) {
  return (
    <div className="snippet">
      <pre>
        <code>{text}</code>
      </pre>
      <CopyButton text={text} />
    </div>
  );
}
