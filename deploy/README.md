# Запуск на сервере

Схема: **Caddy** принимает HTTPS на `mobility.speedware.tech`, сам получает и продлевает сертификат и передаёт запросы приложению на `127.0.0.1:3000`. Приложение работает как служба **systemd** и перезапускается само.

| Файл | Куда | Зачем |
| --- | --- | --- |
| `mobility.service` | `/etc/systemd/system/` | служба приложения |
| `Caddyfile` | `/etc/caddy/Caddyfile` | HTTPS и проксирование |
| `backup.sh` | запускается из cron | ежедневная копия базы |
| `update.sh` | запускается вручную | обновление до последней версии |

Команды ниже — для Ubuntu 24.04. Приложение ставится в `/opt/mobility-tracker` и работает от отдельного пользователя `mobility`.

## 0. До начала

- Сервер с публичным IP (хватит 1 ядра и 1 ГБ памяти).
- DNS: запись **A** `mobility.speedware.tech` → IP сервера. Без неё Caddy не получит сертификат.

## 1. Программы

```bash
sudo apt update
sudo apt install -y git caddy
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # нужна 22.13 или новее
```

## 2. Код

```bash
sudo useradd --system --no-create-home --home-dir /opt/mobility-tracker --shell /usr/sbin/nologin mobility
sudo mkdir /opt/mobility-tracker && sudo chown mobility:mobility /opt/mobility-tracker
```

**Вариант А — из git-репозитория** (удобно обновлять):

```bash
sudo -u mobility git clone <адрес репозитория> /opt/mobility-tracker
```

Если репозиторий закрытый, серверу нужен доступ на чтение: deploy key в настройках репозитория (GitHub → Settings → Deploy keys) или адрес с токеном.

**Вариант Б — копированием с Mac** (из папки проекта):

```bash
rsync -av --exclude .git --exclude data ./ <пользователь>@<сервер>:/tmp/mobility/
# на сервере:
sudo rsync -a /tmp/mobility/ /opt/mobility-tracker/ && sudo chown -R mobility:mobility /opt/mobility-tracker
```

Папка для базы:

```bash
sudo -u mobility mkdir -p /opt/mobility-tracker/data
```

**Перенос текущих данных (по желанию).** Остановите приложение на Mac и скопируйте `data/mobility.db` на сервер в `/opt/mobility-tracker/data/`. Затем:

```bash
sudo chown mobility:mobility /opt/mobility-tracker/data/mobility.db
```

Без этого шага база создастся пустой.

## 3. Служба приложения

```bash
sudo cp /opt/mobility-tracker/deploy/mobility.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mobility
systemctl status mobility        # должно быть active (running)
```

Почта владельца задаётся в `mobility.service`, строка `ADMIN_EMAIL`. После её изменения выполните `sudo systemctl daemon-reload && sudo systemctl restart mobility`.

## 4. HTTPS

```bash
sudo cp /opt/mobility-tracker/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Через минуту откройте `https://mobility.speedware.tech/app` и `https://mobility.speedware.tech/admin`.

## 5. Брандмауэр

Снаружи открыты только SSH и веб. Порт 3000 наружу не открывается: приложение слушает только `127.0.0.1`.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

## 6. Резервные копии

Каждую ночь в 3:00 — копия базы в `/var/backups/mobility`, хранится 14 дней:

```bash
sudo crontab -e
# добавить строку:
0 3 * * * /opt/mobility-tracker/deploy/backup.sh >> /var/log/mobility-backup.log 2>&1
```

Проверить вручную: `sudo /opt/mobility-tracker/deploy/backup.sh`.

Восстановление из копии:

```bash
sudo systemctl stop mobility
gunzip -c /var/backups/mobility/<файл>.db.gz | sudo -u mobility tee /opt/mobility-tracker/data/mobility.db > /dev/null
sudo -u mobility tar -xzf /var/backups/mobility/<файл>-uploads.tar.gz -C /opt/mobility-tracker/data
sudo rm -f /opt/mobility-tracker/data/mobility.db-wal /opt/mobility-tracker/data/mobility.db-shm
sudo systemctl start mobility
```

## 7. Обновление

- Вариант А (git): `sudo /opt/mobility-tracker/deploy/update.sh`
- Вариант Б (rsync): повторите копирование из шага 2, затем `sudo systemctl restart mobility`

## Если что-то не работает

```bash
journalctl -u mobility -f          # логи приложения
journalctl -u caddy -f             # логи HTTPS и сертификата
curl -I http://127.0.0.1:3000/app  # отвечает ли приложение на сервере
```
