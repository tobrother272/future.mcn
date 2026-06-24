#!/bin/bash
echo "=== password_enc in DB ==="
docker exec meridian-postgres psql -U meridian -d meridian -c "SELECT id, email_access, LEFT(password_enc,20) as pwd_enc_preview, password_enc IS NOT NULL as has_pwd FROM channel WHERE id='C_MQJ60PRI37NB';"

echo "=== CHANNEL_CRED_SECRET set? ==="
SECRET=$(docker exec meridian-backend printenv CHANNEL_CRED_SECRET 2>/dev/null)
if [ -z "$SECRET" ]; then echo "NOT SET"; else echo "SET (length=${#SECRET})"; fi

echo "=== Backend image date ==="
docker inspect meridian-backend --format='{{.Created}}' 2>/dev/null | cut -c1-20
