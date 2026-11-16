COURSE.addModule({
  id: 'm8',
  title: 'Spring Security',
  description: 'Аутентификация и авторизация: цепочка фильтров вместо Passport, хэширование паролей, роли, защита методов, JWT для REST API.',
  lessons: [
    {
      id: 'security-basics',
      title: 'Основы Spring Security',
      minutes: 40,
      goals: [
        'понимать архитектуру Spring Security: цепочка фильтров, SecurityContext',
        'настраивать доступ к URL через <code>SecurityFilterChain</code>',
        'хэшировать пароли и загружать пользователей через <code>UserDetailsService</code>',
        'защищать методы через <code>@PreAuthorize</code>'
      ],
      body: `
<h2>Термины</h2>
<ul>
  <li><dfn>Authentication</dfn> (аутентификация) — «кто ты?»: проверка логина/пароля или токена. Ошибка — <b>401 Unauthorized</b>.</li>
  <li><dfn>Authorization</dfn> (авторизация) — «что тебе можно?»: проверка ролей и прав. Ошибка — <b>403 Forbidden</b>.</li>
  <li><dfn>Principal</dfn> — текущий аутентифицированный пользователь.</li>
  <li><dfn>Authority</dfn> / <dfn>Role</dfn> — право доступа. Роль — это authority с префиксом <code>ROLE_</code>: <code>hasRole("ADMIN")</code> проверяет authority <code>ROLE_ADMIN</code>.</li>
</ul>

<h2>Архитектура: цепочка фильтров</h2>
<p>Spring Security — это набор Servlet-фильтров (тех самых, что аналог Express-middleware), которые выполняются <b>до</b> контроллеров:</p>
${flow('Запрос', 'CorsFilter', 'CsrfFilter', 'Authentication filters', 'AuthorizationFilter', 'Controller')}
<p>Фильтр аутентификации извлекает учётные данные (Basic-заголовок, JWT, сессию), проверяет их и кладёт результат в <dfn>SecurityContext</dfn> — хранилище, привязанное к текущему потоку (помнишь thread-per-request?). Дальше любой код может узнать, кто сейчас работает.</p>
${node(`<p>В Passport: <code>app.use(passport.authenticate("jwt"))</code> кладёт пользователя в <code>req.user</code>. В Spring: фильтр кладёт <code>Authentication</code> в <code>SecurityContextHolder</code>, а в контроллере его можно получить аргументом.</p>`)}

<h2>Подключаем</h2>
${xml`
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-security</artifactId>
</dependency>`}
<p>Сразу после добавления стартера <b>все эндпоинты закрыты</b>: Spring Boot создаёт пользователя <code>user</code> и печатает сгенерированный пароль в лог при старте (<code>Using generated security password: ...</code>). Безопасность по умолчанию — «запрещено всё, что не разрешено явно».</p>

<h2>SecurityFilterChain</h2>
<p>Настройка — бином <code>SecurityFilterChain</code> с lambda-DSL:</p>
${java`
@@ SecurityConfig.java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity              // включает @PreAuthorize
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                       // для stateless REST API, см. ниже
            .cors(Customizer.withDefaults())                    // использовать CORS-настройки MVC
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tasks/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())                  // всё остальное — только с логином
            .httpBasic(Customizer.withDefaults());              // пока — Basic Auth
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}`}
<ul>
  <li>Правила <code>requestMatchers</code> проверяются <b>сверху вниз</b>, срабатывает первое подходящее — конкретные правила пиши выше общих.</li>
  <li><code>/error</code> в <code>permitAll</code> — важная деталь: при ошибке Spring Boot делает внутренний переход на <code>/error</code>, и если он закрыт, вместо настоящей ошибки (400, 500) клиент получит 401.</li>
  <li><dfn>CSRF</dfn> (Cross-Site Request Forgery) защищает приложения, где браузер автоматически отправляет cookie сессии. REST API с токеном в заголовке <code>Authorization</code> этой атаке не подвержен, поэтому защиту отключают. Если аутентификация на cookie — CSRF оставляй включённым.</li>
</ul>

<h2>Пароли</h2>
<p>Пароли хранятся только в виде хэша. <dfn>BCrypt</dfn> — медленная хэш-функция с солью, как пакет <code>bcrypt</code> в Node:</p>
${cmp(js`
const hash = await bcrypt.hash(password, 10);
const ok = await bcrypt.compare(password, hash);`, java`
String hash = passwordEncoder.encode(password);
boolean ok = passwordEncoder.matches(password, hash);`)}

<h2>Откуда брать пользователей: UserDetailsService</h2>
<p>Spring Security не знает о твоей таблице <code>users</code>. Мост — интерфейс <dfn>UserDetailsService</dfn> с одним методом: загрузить пользователя по имени. Проверку пароля Spring сделает сам.</p>
${java`
@Service
public class DbUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    public DbUserDetailsService(UserRepository users) { this.users = users; }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = users.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return org.springframework.security.core.userdetails.User
            .withUsername(user.getEmail())
            .password(user.getPasswordHash())
            .roles(user.getRole().name())          // "ADMIN" -> authority "ROLE_ADMIN"
            .build();
    }
}`}
<p>Как только в контексте есть бины <code>UserDetailsService</code> и <code>PasswordEncoder</code>, Spring Boot использует их для аутентификации. Для экспериментов без БД подойдёт <code>InMemoryUserDetailsManager</code>:</p>
${java`
@Bean
UserDetailsService users(PasswordEncoder encoder) {
    return new InMemoryUserDetailsManager(
        User.withUsername("user").password(encoder.encode("password")).roles("USER").build(),
        User.withUsername("admin").password(encoder.encode("admin")).roles("USER", "ADMIN").build());
}`}

<h2>Кто сейчас залогинен</h2>
${java`
@GetMapping("/api/me")
public Map<String, Object> me(Authentication auth) {        // внедряется автоматически
    return Map.of(
        "name", auth.getName(),
        "authorities", auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList());
}

// альтернатива — сам principal:
@GetMapping("/api/me2")
public String me2(@AuthenticationPrincipal UserDetails user) {
    return user.getUsername();
}

// из любого места кода (например, из сервиса):
Authentication auth = SecurityContextHolder.getContext().getAuthentication();`}

<h2>Защита методов</h2>
<p>URL-правила удобны для грубой нарезки. Точечная авторизация — на методах сервисов или контроллеров:</p>
${java`
@Service
public class AdminService {

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(long id) { ... }

    @PreAuthorize("hasRole('ADMIN') or #email == authentication.name")   // SpEL-выражение
    public UserResponse getProfile(String email) { ... }
}`}
<p><code>@PreAuthorize</code> работает через прокси (как <code>@Transactional</code>), поэтому для неё действуют те же правила: public-методы, вызов извне бина. Нужна аннотация <code>@EnableMethodSecurity</code> на конфигурации.</p>
${warn(`<p>Проверка владения ресурсом («пользователь может менять только свои задачи») — это бизнес-логика. Обычно её делают в сервисе явно: загрузил задачу, сравнил <code>task.getOwner().getId()</code> с текущим пользователем, бросил <code>AccessDeniedException</code> или вернул 404 (чтобы не раскрывать существование чужих объектов).</p>`)}
`,
      tasks: [
        {
          title: 'Basic Auth для todo-api',
          text: `<p>Подключи Spring Security к <code>todo-api</code>. Создай сущность <code>User</code> (email, passwordHash, role) с миграцией, <code>DbUserDetailsService</code> и эндпоинт <code>POST /api/public/register</code>, который хэширует пароль. Правила: регистрация — всем, <code>DELETE /api/tasks/**</code> — только ADMIN, остальное — аутентифицированным. Проверь через curl с <code>-u email:password</code>.</p>`,
          solution: `${java`
            @Service
            public class RegistrationService {
                private final UserRepository users;
                private final PasswordEncoder encoder;

                public RegistrationService(UserRepository users, PasswordEncoder encoder) {
                    this.users = users;
                    this.encoder = encoder;
                }

                @Transactional
                public UserResponse register(RegisterRequest req) {
                    String email = req.email().strip().toLowerCase();
                    if (users.existsByEmail(email)) throw new ConflictException("Email already registered");
                    User user = users.save(new User(email, encoder.encode(req.password()), Role.USER));
                    return UserResponse.from(user);
                }
            }

            // SecurityConfig
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/error").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/tasks/**").hasRole("ADMIN")
                .anyRequest().authenticated())`}${bash`
            curl -X POST localhost:8080/api/public/register -H "Content-Type: application/json" -d '{"email":"a@x.ru","password":"secret123"}'
            curl -u a@x.ru:secret123 localhost:8080/api/tasks            # 200
            curl -u a@x.ru:secret123 -X DELETE localhost:8080/api/tasks/1  # 403
            curl localhost:8080/api/tasks                                  # 401`}`
        }
      ],
      quiz: [
        { q: 'Пользователь залогинен, но у него нет нужной роли. Какой статус?', options: ['401', '403', '404', '400'], answer: 1, explain: '401 — не аутентифицирован, 403 — аутентифицирован, но доступ запрещён.' },
        { q: 'Что происходит сразу после добавления spring-boot-starter-security?', options: ['Ничего', 'Все эндпоинты требуют аутентификации, генерируется пароль для user', 'Включается JWT', 'Приложение не стартует'], answer: 1, explain: 'Безопасная конфигурация по умолчанию — закрыто всё.' },
        { q: '<code>hasRole("ADMIN")</code> проверяет authority…', options: ['ADMIN', 'ROLE_ADMIN', 'admin', 'SCOPE_ADMIN'], answer: 1, explain: 'Роль — это authority с префиксом ROLE_.' },
        { q: 'Зачем <code>/error</code> в permitAll?', options: ['Для красоты', 'Чтобы при ошибках клиент видел реальный статус, а не 401 из-за внутреннего перехода на закрытый /error', 'Чтобы отключить ошибки', 'Так требует CSRF'], answer: 1, explain: 'Spring Boot перенаправляет ошибки на /error, который тоже проходит через Security.' }
      ]
    },

    {
      id: 'jwt',
      title: 'JWT-аутентификация для REST API',
      minutes: 45,
      goals: [
        'выпускать JWT при логине средствами Spring Security',
        'проверять токен через OAuth2 Resource Server',
        'передавать роли в токене и использовать их в авторизации',
        'получать текущего пользователя в контроллерах'
      ],
      body: `
<h2>План</h2>
<p>Классическая схема, которую ты, скорее всего, делал на Express с <code>jsonwebtoken</code>:</p>
<ol>
  <li><code>POST /api/auth/login</code> с email и паролем → проверяем → выдаём подписанный <dfn>JWT</dfn> (JSON Web Token).</li>
  <li>Клиент шлёт заголовок <code>Authorization: Bearer &lt;token&gt;</code>.</li>
  <li>Фильтр проверяет подпись и срок действия, достаёт пользователя и роли.</li>
</ol>
<p>В Spring не нужно писать свой JWT-фильтр (хотя в старых туториалах так делают): модуль <dfn>OAuth2 Resource Server</dfn> умеет проверять JWT из коробки, а библиотека Nimbus внутри него — выпускать токены. Для учебного проекта используем симметричный ключ HMAC (HS256), как <code>jwt.sign(payload, secret)</code>.</p>
${xml`
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>`}
${yaml`
jwt:
  secret: \${JWT_SECRET:change-me-to-a-long-random-string-at-least-32-bytes}
  ttl: 1h`}
${warn(`<p>Для HS256 секрет должен быть не короче 32 байт (256 бит), иначе библиотека откажется работать. В проде — только из переменной окружения или секрет-хранилища.</p>`)}

<h2>Конфигурация безопасности</h2>
${java`
@@ SecurityConfig.java
package com.example.todo.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/error").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    @Bean
    SecretKey jwtKey(@Value("\${jwt.secret}") String secret) {
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtKey) {                  // выпуск токенов
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtKey));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtKey) {                  // проверка токенов
        return NimbusJwtDecoder.withSecretKey(jwtKey).macAlgorithm(MacAlgorithm.HS256).build();
    }

    // роли берём из claim "roles" как есть: ["ROLE_USER", "ROLE_ADMIN"]
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        var authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("roles");
        authorities.setAuthorityPrefix("");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean   // AuthenticationManager для ручной проверки логина/пароля в AuthController
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}`}
<p><code>AuthenticationManager</code> построится автоматически из твоих бинов <code>UserDetailsService</code> (из прошлого урока) и <code>PasswordEncoder</code>.</p>

<h2>Выпуск токена</h2>
${cmp(js`
const token = jwt.sign(
  { sub: user.email, roles: user.roles },
  process.env.JWT_SECRET,
  { expiresIn: "1h", issuer: "todo-api" }
);`, java`
@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final Duration ttl;

    public TokenService(JwtEncoder encoder,
                        @Value("\${jwt.ttl}") Duration ttl) {
        this.encoder = encoder;
        this.ttl = ttl;
    }

    public String issue(Authentication auth) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("todo-api")
            .issuedAt(now)
            .expiresAt(now.plus(ttl))
            .subject(auth.getName())
            .claim("roles", auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).toList())
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims))
            .getTokenValue();
    }
}`, 'jsonwebtoken', 'Spring Security')}

<h2>Контроллер аутентификации</h2>
${java`
@@ AuthController.java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authManager;
    private final TokenService tokenService;
    private final RegistrationService registration;

    public AuthController(AuthenticationManager authManager, TokenService tokenService,
                          RegistrationService registration) {
        this.authManager = authManager;
        this.tokenService = tokenService;
        this.registration = registration;
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record TokenResponse(String accessToken, String tokenType) {}

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest req) {
        return registration.register(req);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
            UsernamePasswordAuthenticationToken.unauthenticated(req.email(), req.password()));
        return new TokenResponse(tokenService.issue(auth), "Bearer");
    }
}`}
<p>Если пароль неверный, <code>authenticate</code> бросит <code>BadCredentialsException</code>. Добавь обработчик в <code>GlobalExceptionHandler</code>, чтобы клиент получил аккуратный 401:</p>
${java`
@ExceptionHandler(AuthenticationException.class)
public ProblemDetail badCredentials(AuthenticationException ex) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Invalid email or password");
}

@ExceptionHandler(AccessDeniedException.class)    // от @PreAuthorize
public ProblemDetail forbidden(AccessDeniedException ex) {
    return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied");
}`}

<h2>Текущий пользователь из токена</h2>
${java`
@GetMapping("/api/me")
public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
    return Map.of(
        "email", jwt.getSubject(),
        "roles", jwt.getClaimAsStringList("roles"),
        "expiresAt", jwt.getExpiresAt());
}

// в сервисе удобнее передавать email/id явным параметром из контроллера:
@PostMapping("/api/tasks")
public TaskResponse create(@Valid @RequestBody CreateTaskRequest req, @AuthenticationPrincipal Jwt jwt) {
    return taskService.create(jwt.getSubject(), req);
}`}

<h2>Проверка</h2>
${http`
### Регистрация
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{ "email": "anya@example.com", "password": "secret123" }

### Логин
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{ "email": "anya@example.com", "password": "secret123" }

### Запрос с токеном
GET http://localhost:8080/api/me
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...`}
${info(`<p><b>Что дальше в реальных проектах.</b> Часто аутентификацию выносят во внешний сервер авторизации (Keycloak, Auth0, Okta, Spring Authorization Server). Тогда твоё приложение — только Resource Server: ты убираешь выпуск токенов и указываешь <code>spring.security.oauth2.resourceserver.jwt.issuer-uri</code>, а проверка подписи по публичным ключам (RS256) настроится автоматически. Код контроллеров и <code>@PreAuthorize</code> не меняется.</p>`)}
`,
      tasks: [
        {
          title: 'Свои задачи',
          text: `<p>Добавь сущности <code>Task</code> поле <code>owner</code> (<code>@ManyToOne</code> на <code>User</code>, миграцией). Пользователь видит и меняет только свои задачи: список фильтруется по владельцу, а чужая задача по id даёт 404. Администратор (<code>ROLE_ADMIN</code>) через <code>GET /api/admin/tasks</code> видит все.</p>`,
          solution: java`
            public interface TaskRepository extends JpaRepository<Task, Long> {
                Page<Task> findByOwnerEmail(String email, Pageable pageable);
                Optional<Task> findByIdAndOwnerEmail(long id, String email);
            }

            @Service
            @Transactional(readOnly = true)
            public class TaskService {
                private final TaskRepository tasks;
                private final UserRepository users;

                // конструктор ...

                public Page<TaskResponse> myTasks(String email, Pageable pageable) {
                    return tasks.findByOwnerEmail(email, pageable).map(TaskResponse::from);
                }

                public TaskResponse get(String email, long id) {
                    return tasks.findByIdAndOwnerEmail(id, email)
                        .map(TaskResponse::from)
                        .orElseThrow(() -> new NotFoundException("Task " + id + " not found"));
                }

                @Transactional
                public TaskResponse create(String email, CreateTaskRequest req) {
                    User owner = users.findByEmail(email).orElseThrow();
                    Task task = tasks.save(new Task(owner, req.title(), req.description(), req.dueDate()));
                    return TaskResponse.from(task);
                }

                @PreAuthorize("hasRole('ADMIN')")      // дублирует URL-правило — защита в глубину
                public Page<TaskResponse> all(Pageable pageable) {
                    return tasks.findAll(pageable).map(TaskResponse::from);
                }
            }

            @GetMapping("/api/tasks/{id}")
            public TaskResponse get(@PathVariable long id, @AuthenticationPrincipal Jwt jwt) {
                return taskService.get(jwt.getSubject(), id);
            }`
        }
      ],
      quiz: [
        { q: 'Какой модуль Spring проверяет JWT в заголовке Authorization из коробки?', options: ['spring-boot-starter-web', 'OAuth2 Resource Server', 'Spring Data', 'Actuator'], answer: 1, explain: 'spring-boot-starter-oauth2-resource-server добавляет BearerTokenAuthenticationFilter и проверку JWT.' },
        { q: 'Где в контроллере взять данные из токена?', options: ['@RequestHeader("Authorization") и разобрать вручную', '@AuthenticationPrincipal Jwt jwt', 'req.user', 'System.getenv'], answer: 1, explain: 'Resource Server уже проверил токен и положил Jwt в SecurityContext.' },
        { q: 'Минимальная длина секрета для HS256:', options: ['8 байт', '16 байт', '32 байта', 'Без ограничений'], answer: 2, explain: '256 бит = 32 байта.' },
        { q: 'Зачем отключают CSRF для JWT-API?', options: ['Для скорости', 'Токен в заголовке не отправляется браузером автоматически, поэтому CSRF-атака неприменима', 'JWT несовместим с CSRF', 'Так требует Spring'], answer: 1, explain: 'CSRF эксплуатирует автоматическую отправку cookie.' }
      ]
    }
  ]
});
