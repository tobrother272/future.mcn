#!/bin/bash
echo "=== Channel credentials check ==="
docker exec meridian-postgres psql -U meridian -d meridian -c "SELECT id, email_access, password_enc IS NOT NULL as has_pwd FROM channel WHERE id='C_MQJ60PRI37NB';"

echo "=== CHANNEL_CRED_SECRET check ==="
docker exec meridian-backend printenv CHANNEL_CRED_SECRET | wc -c
