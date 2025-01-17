FROM mysql

ENV MYSQL_ROOT_PASSWORD=root
ENV MYSQL_DATABASE=db_journal

EXPOSE 3306

COPY ./script.sql /docker-entrypoint-initdb.d/script.sql

RUN chown -R mysql:mysql /docker-entrypoint-initdb.d/

VOLUME [ "/var/lib/mysql" ]

CMD ["mysqld", "--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci"]
