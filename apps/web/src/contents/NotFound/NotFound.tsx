import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="py-24 text-center">
      <p className="text-muted">{t("app.notFound")}</p>
      <Link to="/" className="btn-secondary mt-4 inline-block">
        {t("app.backHome")}
      </Link>
    </div>
  );
};
