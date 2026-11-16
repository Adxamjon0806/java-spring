COURSE.addModule({
  id: 'm10',
  title: 'Продакшен и финальный проект',
  description: 'Логирование, Actuator и метрики, документация API, Docker и docker-compose. Финальный проект, который соберёт всё вместе.',
  lessons: [
    {
      id: 'production',
      title: 'Логи, Actuator, OpenAPI, Docker',
      minutes: 40,
      goals: [
        'логировать через SLF4J с правильными уровнями и параметрами',
        'включить health-checks и метрики через Actuator',
        'сгенерировать документацию API (Swagger UI)',
        'упаковать приложение в Docker-образ и запустить с БД через docker-compose'
      ],
      body: `
<h2>Логирование</h2>
<p>В Spring Boot логирование уже настроено: <dfn>SLF4J</dfn> (Simple Logging Facade for Java — общий API логирования) + <dfn>Logback</dfn> (реализация). Аналог winston/pino.</p>
${cmp(js`
const logger = pino();

logger.info({ userId, taskId }, "Task created");
logger.error({ err }, "Payment failed");
logger.debug("Details: %o", obj);`, java`
private static final Logger log =
    LoggerFactory.getLogger(TaskService.class);

log.info("Task {} created by user {}", taskId, userId);
log.error("Payment failed for order {}", orderId, ex); // ex — последним
log.debug("Details: {}", obj);`, 'pino', 'SLF4J')}
<ul>
  <li><code>{}</code> — плейсхолдеры. <b>Не склеивай строки</b> (<code>"Task " + id</code>): с плейсхолдерами строка не собирается, если уровень отключён.</li>
  <li>Исключение передаётся <b>последним аргументом</b> без плейсхолдера — тогда в лог попадёт полный стек.</li>
  <li>Уровни: <code>TRACE</code> &lt; <code>DEBUG</code> &lt; <code>INFO</code> &lt; <code>WARN</code> &lt; <code>ERROR</code>.</li>
</ul>
${yaml`
logging:
  level:
    root: info
    com.example.todo: debug           # твой код подробнее
    org.hibernate.SQL: debug          # SQL-запросы (только в dev!)
  structured:
    format:
      console: ecs                    # JSON-логи для ELK/Loki (Spring Boot 3.4+)`}
${tip(`<p>В проде логи пишут в stdout в JSON (structured logging), а собирает их инфраструктура — как и в Node-мире. Настраивай это в <code>application-prod.yml</code>, а локально оставь читаемый текстовый формат.</p>`)}

<h2>Actuator: health-checks и метрики</h2>
<p><dfn>Spring Boot Actuator</dfn> добавляет служебные эндпоинты для эксплуатации: здоровье приложения, метрики, информацию о сборке.</p>
${xml`
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>`}
${yaml`
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  endpoint:
    health:
      probes:
        enabled: true                 # /actuator/health/liveness и /readiness для Kubernetes
      show-details: when-authorized`}
${table(['Эндпоинт', 'Что показывает'], [
  ['<code>/actuator/health</code>', '<code>{"status":"UP"}</code> + проверки БД, диска и т.д. Для балансировщиков и Kubernetes'],
  ['<code>/actuator/metrics</code>', 'Метрики Micrometer: JVM-память, потоки, HTTP-запросы, пул соединений'],
  ['<code>/actuator/prometheus</code>', 'Метрики в формате Prometheus (нужна зависимость <code>micrometer-registry-prometheus</code>)'],
  ['<code>/actuator/info</code>', 'Версия, git-коммит, произвольная информация']
])}
${warn(`<p>Не открывай наружу всё (<code>include: "*"</code>): эндпоинты <code>env</code>, <code>heapdump</code>, <code>configprops</code> могут раскрыть секреты. Не забудь разрешить <code>/actuator/health</code> в SecurityFilterChain, а остальное — закрыть или вынести на отдельный порт (<code>management.server.port</code>).</p>`)}

<h2>Документация API: OpenAPI и Swagger UI</h2>
<p>Библиотека <dfn>springdoc-openapi</dfn> сама строит спецификацию OpenAPI по контроллерам, DTO и аннотациям валидации — как swagger-jsdoc, только без ручных комментариев.</p>
${xml`
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>2.8.9</version>   <!-- проверь актуальную версию, совместимую с твоим Spring Boot -->
</dependency>`}
<p>После перезапуска: <code>http://localhost:8080/swagger-ui.html</code> — интерактивная документация, <code>/v3/api-docs</code> — JSON-спецификация (из неё можно сгенерировать TypeScript-клиент для React-фронтенда). Описания добавляются аннотациями <code>@Operation(summary = "...")</code>, <code>@Tag</code>, <code>@Schema</code>. Не забудь открыть эти пути в Security.</p>

<h2>Docker</h2>
<p>Многоэтапная сборка: в первом образе — JDK и Maven для сборки, во втором — только JRE и готовый JAR.</p>
${docker`
@@ Dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q dependency:go-offline          # слой с зависимостями кэшируется
COPY src src
RUN ./mvnw -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system appuser
USER appuser
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]`}
<ul>
  <li><code>-XX:MaxRAMPercentage=75</code> — JVM учитывает лимит памяти контейнера; куча займёт до 75% от него. Аналог <code>--max-old-space-size</code>, но в процентах.</li>
  <li>Альтернатива без Dockerfile: <code>./mvnw spring-boot:build-image</code> собирает оптимизированный образ через Cloud Native Buildpacks.</li>
  <li>На Windows у <code>mvnw</code> могут слететь права на исполнение и окончания строк — если сборка в Docker пишет <code>permission denied</code>, добавь <code>RUN chmod +x mvnw</code> и проверь, что файл в LF.</li>
</ul>
${yaml`
@@ compose.yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: todo
      POSTGRES_USER: todo
      POSTGRES_PASSWORD: todo
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U todo"]
      interval: 5s
      retries: 10

  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/todo
      SPRING_DATASOURCE_USERNAME: todo
      SPRING_DATASOURCE_PASSWORD: todo
      JWT_SECRET: please-use-a-real-secret-with-32-plus-bytes
    depends_on:
      db:
        condition: service_healthy`}
${bash`
docker compose up --build
curl http://localhost:8080/actuator/health`}
${info(`<p>Spring Boot умеет и обратное: зависимость <code>spring-boot-docker-compose</code> при локальном запуске сама выполнит <code>docker compose up</code> для сервисов из <code>compose.yaml</code> и подключится к ним. А ещё есть <dfn>graceful shutdown</dfn> (включён по умолчанию в Boot 3.4+): при остановке контейнера приложение перестаёт принимать запросы и дожидается текущих.</p>`)}

<h2>Чек-лист готовности к продакшену</h2>
${checklist('prod', [
  'Секреты (пароль БД, JWT_SECRET) — только из переменных окружения',
  '<code>ddl-auto: validate</code>, схема — через миграции Flyway',
  '<code>open-in-view: false</code>',
  'Отдельный профиль <code>prod</code> с JSON-логами и уровнем INFO',
  'Actuator: открыт только health (и метрики для мониторинга)',
  'Глобальный обработчик ошибок не раскрывает стектрейсы клиенту',
  'CORS разрешает только реальные домены фронтенда',
  'Образ запускается не от root, задан лимит памяти',
  'Тесты (включая Testcontainers) проходят в CI'
])}
`,
      tasks: [
        {
          title: 'Контейнеризация',
          text: `<p>Добавь в <code>todo-api</code> Actuator, springdoc и <code>application-prod.yml</code> со structured logging. Напиши Dockerfile и <code>compose.yaml</code>, подними всё командой <code>docker compose up --build</code>, проверь <code>/actuator/health</code> (должен показывать статус БД при авторизованном запросе) и Swagger UI.</p>`,
          solution: `${yaml`
            # application-prod.yml
            logging:
              level:
                root: info
              structured:
                format:
                  console: ecs
            management:
              endpoints:
                web:
                  exposure:
                    include: health
            spring:
              jpa:
                hibernate:
                  ddl-auto: validate`}${java`
            // SecurityConfig — открыть служебные пути
            .requestMatchers("/actuator/health/**", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()`}`
        }
      ],
      quiz: [
        { q: 'Как правильно залогировать исключение?', options: ['log.error("Fail: " + ex)', 'log.error("Fail for order {}", orderId, ex)', 'ex.printStackTrace()', 'System.out.println(ex)'], answer: 1, explain: 'Плейсхолдеры для данных, исключение — последним аргументом, тогда в лог попадёт стек.' },
        { q: 'Какой эндпоинт Actuator используют балансировщики и Kubernetes?', options: ['/actuator/env', '/actuator/health', '/actuator/beans', '/actuator/heapdump'], answer: 1, explain: 'health (и его liveness/readiness-группы) отвечает «жив ли сервис».' },
        { q: 'Зачем многоэтапный Dockerfile?', options: ['Так быстрее запускается JVM', 'Итоговый образ содержит только JRE и JAR, без JDK, Maven и исходников', 'Иначе Spring не стартует', 'Для поддержки Windows'], answer: 1, explain: 'Образ меньше и безопаснее.' }
      ]
    },

    {
      id: 'final-project',
      title: 'Финальный проект: Task Tracker API',
      minutes: 600,
      goals: [
        'самостоятельно спроектировать и реализовать REST API на Spring Boot от начала до конца',
        'применить всё из курса: слои, DTO, валидацию, JPA, миграции, Security/JWT, тесты, Docker',
        'получить проект для портфолио и собеседований'
      ],
      body: `
<p>Пора собрать всё вместе. Ты пишешь бэкенд трекера задач для небольших команд — аналог упрощённого Trello/Jira. К нему можно сделать React-фронтенд, и у тебя будет fullstack-проект для портфолио.</p>
${tip(`<p>Работай итерациями: каждая — рабочее приложение с тестами и коммитом в git. Не пытайся сделать всё сразу. Если застрял — вернись к соответствующему уроку: в каждом этапе указано, какой.</p>`)}

<h2>Предметная область</h2>
${table(['Сущность', 'Поля', 'Связи'], [
  ['<b>User</b>', 'id, email (уникальный), name, passwordHash, role (USER/ADMIN), createdAt', '—'],
  ['<b>Project</b>', 'id, name, description, createdAt', 'owner → User; members ↔ User (через ProjectMember)'],
  ['<b>ProjectMember</b>', 'id, role в проекте (OWNER/MEMBER), joinedAt', 'project → Project, user → User'],
  ['<b>Task</b>', 'id, title, description, status (TODO/IN_PROGRESS/DONE), priority (LOW/MEDIUM/HIGH), dueDate, createdAt, updatedAt', 'project → Project, assignee → User (nullable)'],
  ['<b>Comment</b>', 'id, text, createdAt', 'task → Task, author → User']
])}

<h2>API</h2>
${table(['Метод и путь', 'Описание', 'Доступ'], [
  ['<code>POST /api/auth/register</code>, <code>/login</code>', 'Регистрация и выдача JWT', 'Все'],
  ['<code>GET /api/me</code>', 'Профиль текущего пользователя', 'Аутентифицированные'],
  ['<code>GET/POST /api/projects</code>', 'Мои проекты / создать (создатель становится OWNER)', 'Аутентифицированные'],
  ['<code>GET/PATCH/DELETE /api/projects/{id}</code>', 'Проект; изменять и удалять — только OWNER', 'Участники'],
  ['<code>POST /api/projects/{id}/members</code>', 'Добавить участника по email', 'OWNER'],
  ['<code>GET /api/projects/{id}/tasks?status=&amp;assignee=&amp;q=&amp;page=&amp;sort=</code>', 'Задачи с фильтрами и пагинацией', 'Участники'],
  ['<code>POST /api/projects/{id}/tasks</code>', 'Создать задачу', 'Участники'],
  ['<code>PATCH /api/tasks/{id}</code>', 'Изменить поля, статус, исполнителя (исполнитель — только участник проекта)', 'Участники'],
  ['<code>GET/POST /api/tasks/{id}/comments</code>', 'Комментарии', 'Участники'],
  ['<code>GET /api/admin/stats</code>', 'Число пользователей, проектов, задач по статусам', 'ADMIN']
])}
<p>Бизнес-правила: не участник проекта получает <b>404</b> на любые его ресурсы; переход статуса <code>DONE → TODO</code> запрещён (<b>409</b>); <code>dueDate</code> не может быть в прошлом при создании (<b>400</b>).</p>

<h2>Этапы</h2>
<h3>Этап 1. Каркас (модули 4–6)</h3>
${checklist('final-1', [
  'Проект на start.spring.io: Web, Validation, Data JPA, PostgreSQL, Flyway, Security, OAuth2 Resource Server, Actuator, DevTools, Testcontainers',
  'Структура пакетов по фичам: <code>auth</code>, <code>user</code>, <code>project</code>, <code>task</code>, <code>comment</code>, <code>common</code>, <code>config</code>',
  '<code>application.yml</code> + <code>application-dev.yml</code>, <code>@ConfigurationProperties</code> для своих настроек',
  '<code>GlobalExceptionHandler</code> с ProblemDetail и своими исключениями <code>NotFoundException</code>, <code>ConflictException</code>'
])}
<h3>Этап 2. Данные (модуль 7)</h3>
${checklist('final-2', [
  'Миграции Flyway для всех таблиц, индексы на внешние ключи, <code>ddl-auto: validate</code>',
  'Сущности со связями, все <code>@ManyToOne</code> — LAZY',
  'Репозитории; список задач без N+1 (проверь лог SQL)',
  'Сервисы с <code>@Transactional</code>, маппинг в DTO внутри транзакций'
])}
<h3>Этап 3. Безопасность (модуль 8)</h3>
${checklist('final-3', [
  'Регистрация с BCrypt, логин с выдачей JWT, роли в токене',
  'Проверка членства в проекте в сервисном слое',
  '<code>/api/admin/**</code> только для ADMIN, плюс <code>@PreAuthorize</code> на сервисе',
  'Обработчики 401/403 в едином формате ProblemDetail'
])}
<h3>Этап 4. Тесты (модули 4 и 9)</h3>
${checklist('final-4', [
  'Юнит-тесты бизнес-правил (переходы статусов, права OWNER/MEMBER)',
  '<code>@WebMvcTest</code> для контроллеров: валидация, статусы, безопасность',
  '<code>@DataJpaTest</code> + Testcontainers для нетривиальных запросов',
  'Минимум один сквозной <code>@SpringBootTest</code>-сценарий'
])}
<h3>Этап 5. Продакшен (модуль 10)</h3>
${checklist('final-5', [
  'Dockerfile + <code>compose.yaml</code> (приложение + PostgreSQL)',
  'Профиль prod: JSON-логи, только health в Actuator, секреты из env',
  'Swagger UI с описаниями эндпоинтов',
  'README: как запустить, переменные окружения, примеры запросов',
  'CI: GitHub Actions с <code>./mvnw verify</code> (Docker для Testcontainers в GitHub Actions уже есть)'
])}

<h2>Идеи для развития</h2>
<ul>
  <li><b>Кэширование</b>: <code>@Cacheable</code> + Redis (<code>spring-boot-starter-data-redis</code>) для статистики.</li>
  <li><b>Фоновые задачи</b>: <code>@Scheduled</code> — ежедневное письмо о просроченных задачах; <code>@Async</code> для отправки уведомлений.</li>
  <li><b>События</b>: <code>ApplicationEventPublisher</code> + <code>@TransactionalEventListener</code> — «задача назначена» → уведомление после коммита.</li>
  <li><b>Оптимистичная блокировка</b>: поле <code>@Version</code> в <code>Task</code>, чтобы два одновременных PATCH не затирали друг друга (409).</li>
  <li><b>Аудит</b>: <code>@CreatedDate</code>, <code>@LastModifiedDate</code>, <code>@CreatedBy</code> через Spring Data JPA Auditing.</li>
  <li><b>Загрузка файлов</b> к задачам: <code>MultipartFile</code> + S3-совместимое хранилище (MinIO в compose).</li>
  <li><b>Очереди</b>: Kafka или RabbitMQ (Spring for Apache Kafka / Spring AMQP) — когда появится второй сервис.</li>
</ul>

<h2>Что изучать дальше</h2>
${table(['Тема', 'Зачем'], [
  ['Официальные гайды spring.io/guides', 'Короткие пошаговые руководства по каждой технологии'],
  ['Документация Spring Boot, Spring Data JPA, Spring Security', 'Reference — лучший источник точных ответов'],
  ['Книга «Effective Java» (Joshua Bloch)', 'Идиоматичная Java: как писать так, как пишут опытные разработчики'],
  ['Книга «Java Persistence with Spring Data and Hibernate»', 'Глубокое понимание JPA'],
  ['Блог Влада Михалчи (vladmihalcea.com)', 'Производительность JPA/Hibernate'],
  ['Spring WebFlux / Project Reactor', 'Реактивная модель, близкая к Node, — когда понадобится'],
  ['Kotlin', 'Второй язык JVM, отлично дружит со Spring; многим JS/TS-разработчикам он ближе по духу']
])}
<p>🎉 Если ты прошёл все модули и сделал проект — ты готов писать production-код на Java и Spring и проходить собеседования на позицию Java/Spring-разработчика. Удачи!</p>
`,
      tasks: [],
      quiz: [
        { q: 'Пользователь запрашивает задачу проекта, в котором он не состоит. Какой ответ правильный по ТЗ?', options: ['200', '403', '404', '500'], answer: 2, explain: '404 не раскрывает факт существования чужого ресурса.' },
        { q: 'Как предотвратить затирание изменений при одновременных PATCH одной задачи?', options: ['synchronized на контроллере', 'Поле @Version (оптимистичная блокировка)', 'Увеличить пул потоков', 'ddl-auto: update'], answer: 1, explain: 'При конфликте версий Hibernate бросит OptimisticLockException — его можно превратить в 409.' },
        { q: 'Где проверять, что исполнитель задачи — участник проекта?', options: ['В DTO-аннотации', 'В сервисном слое', 'В миграции', 'В фильтре'], answer: 1, explain: 'Это бизнес-правило, которому нужны данные из БД.' }
      ]
    }
  ]
});
