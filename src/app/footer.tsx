import { ButtonLink } from "./button-link";
import styles from "./footer.module.css";

// Every page's footer: the privacy policy, and the About page with its credits (docs/milestones/M14-14b-1-themes.md).
// Static, so signed-out visitors and Google's brand check see it in the served HTML (M02 2c). Signed in, the shell
// hides it: About and the privacy policy are in the settings sheet (docs/milestones/M14-14b-2b-1-shell.md, criterion 3).
export function Footer() {
  return (
    <footer className={styles.footer}>
      <ButtonLink href="/privacy">Privacy policy</ButtonLink>
      <ButtonLink href="/about">About Plor</ButtonLink>
    </footer>
  );
}
